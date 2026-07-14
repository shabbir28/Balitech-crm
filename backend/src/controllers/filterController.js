const db = require("../config/db");

// GET /api/filters
const getFilters = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM data_filters ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching filters:", err);
    res.status(500).json({ message: "Server error fetching filters" });
  }
};

// POST /api/filters
const createFilter = async (req, res) => {
  const { name, states } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Filter name is required" });
  }

  try {
    const statesJson = JSON.stringify(Array.isArray(states) ? states : []);
    const result = await db.query(
      "INSERT INTO data_filters (name, states) VALUES ($1, $2) RETURNING *",
      [name, statesJson]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating filter:", err);
    if (err.code === "23505") { // Unique violation
      return res.status(400).json({ message: "Filter name already exists" });
    }
    res.status(500).json({ message: "Server error creating filter" });
  }
};

// PUT /api/filters/:id
const updateFilter = async (req, res) => {
  const { id } = req.params;
  const { name, states } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Filter name is required" });
  }

  try {
    const statesJson = JSON.stringify(Array.isArray(states) ? states : []);
    const result = await db.query(
      "UPDATE data_filters SET name = $1, states = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
      [name, statesJson, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Filter not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating filter:", err);
    if (err.code === "23505") {
      return res.status(400).json({ message: "Filter name already exists" });
    }
    res.status(500).json({ message: "Server error updating filter" });
  }
};

// DELETE /api/filters/:id
const deleteFilter = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      "DELETE FROM data_filters WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Filter not found" });
    }

    res.json({ message: "Filter deleted successfully" });
  } catch (err) {
    console.error("Error deleting filter:", err);
    res.status(500).json({ message: "Server error deleting filter" });
  }
};

module.exports = {
  getFilters,
  createFilter,
  updateFilter,
  deleteFilter,
};
