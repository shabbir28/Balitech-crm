const bcrypt = require('bcryptjs');
const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// GET /api/users - List all users (super_admin + admin)
const getUsers = async (req, res) => {
    try {
        const { search, role, status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let conditions = [];
        let params = [];
        let paramIdx = 1;

        if (search) {
            conditions.push(`(first_name ILIKE $${paramIdx} OR last_name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR username ILIKE $${paramIdx})`);
            params.push(`%${search}%`);
            paramIdx++;
        }
        if (role) {
            conditions.push(`role = $${paramIdx}`);
            params.push(role);
            paramIdx++;
        }
        if (status) {
            conditions.push(`status = $${paramIdx}`);
            params.push(status);
            paramIdx++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
        const dataQuery = `
            SELECT id, username, first_name, last_name, email, phone, date_of_birth, 
                   profile_picture, role, status, created_at
            FROM users 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
        `;

        const countResult = await db.query(countQuery, params);
        const dataResult = await db.query(dataQuery, [...params, limit, offset]);

        res.json({
            users: dataResult.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error('getUsers error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query(
            `SELECT id, username, first_name, last_name, email, phone, date_of_birth, profile_picture, role, status, created_at FROM users WHERE id = $1`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('getUserById error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/users - Create user (super_admin only)
const createUser = async (req, res) => {
    const { first_name, last_name, email, phone, date_of_birth, password, role, username } = req.body;

    if (!first_name || !last_name || !email || !password || !role) {
        return res.status(400).json({ message: 'First name, last name, email, password, and role are required' });
    }

    if (!['super_admin', 'admin', 'data_entry'].includes(role)) {
        return res.status(400).json({ message: 'Role must be super_admin, admin, or data_entry' });
    }

    try {
        // Generate username from email if not provided
        const finalUsername = username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Check if email or username already exists
        const existing = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, finalUsername]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Email or username already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        let profile_picture = null;

        if (req.file) {
            profile_picture = `/uploads/profiles/${req.file.filename}`;
        }

        const { rows } = await db.query(
            `INSERT INTO users (username, first_name, last_name, email, phone, date_of_birth, password_hash, role, status, profile_picture, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
             RETURNING id, username, first_name, last_name, email, phone, role, status, profile_picture, created_at`,
            [finalUsername, first_name, last_name, email, phone || null, date_of_birth || null, password_hash, role, profile_picture, req.user.id]
        );

        res.status(201).json({ message: 'User created successfully', user: rows[0] });
    } catch (err) {
        console.error('createUser error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/users/:id - Update user (super_admin only)
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, email, phone, date_of_birth, role, status, password } = req.body;

    try {
        const existing = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        // Prevent non-super-admins from editing super_admin accounts
        if (existing.rows[0].role === 'super_admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Cannot modify a super admin account' });
        }

        let profile_picture = existing.rows[0].profile_picture;
        if (req.file) {
            profile_picture = `/uploads/profiles/${req.file.filename}`;
        }

        let password_hash = existing.rows[0].password_hash;
        if (password && password.trim() !== '') {
            password_hash = await bcrypt.hash(password, 10);
        }

        const { rows } = await db.query(
            `UPDATE users SET 
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                email = COALESCE($3, email),
                phone = COALESCE($4, phone),
                date_of_birth = COALESCE($5, date_of_birth),
                role = COALESCE($6, role),
                status = COALESCE($7, status),
                profile_picture = $8,
                password_hash = $9
             WHERE id = $10
             RETURNING id, username, first_name, last_name, email, phone, role, status, profile_picture, created_at`,
            [first_name, last_name, email, phone, date_of_birth, role, status, profile_picture, password_hash, id]
        );

        res.json({ message: 'User updated successfully', user: rows[0] });
    } catch (err) {
        console.error('updateUser error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /api/users/:id - Deactivate user (super_admin only)
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await db.query('SELECT role FROM users WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ message: 'User not found' });
        if (existing.rows[0].role === 'super_admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Only super admins can deactivate other super admin accounts' });
        }
        if (parseInt(id) === req.user.id) {
            return res.status(403).json({ message: 'Cannot delete your own account' });
        }

        await db.query('UPDATE users SET status = $1 WHERE id = $2', ['inactive', id]);
        res.json({ message: 'User deactivated successfully' });
    } catch (err) {
        console.error('deleteUser error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
