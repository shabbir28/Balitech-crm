const jwt = require("jsonwebtoken");
require('dotenv').config({ path: './.env' });
const token = jwt.sign({ id: 1, role: "super_admin" }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

const form = new FormData();
form.append("first_name", "Test");
form.append("last_name", "User");
form.append("email", "testform2" + Date.now() + "@example.com");
form.append("password", "password123");
form.append("role", "admin");
form.append("accessible_modules", JSON.stringify(["core"]));
form.append("accessible_campaigns", JSON.stringify([]));

fetch("http://localhost:5000/api/users", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + token
  },
  body: form
})
.then(res => res.json())
.then(data => console.log("Response:", data))
.catch(err => console.error("Fetch Error:", err));
