const http = require("http");
const FormData = require("form-data");
const jwt = require("jsonwebtoken");

require('dotenv').config({ path: './.env' });
const token = jwt.sign({ id: 1, role: "super_admin" }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

const form = new FormData();
form.append("first_name", "Test");
form.append("last_name", "User");
form.append("email", "testform" + Date.now() + "@example.com");
form.append("password", "password123");
form.append("role", "admin");
form.append("accessible_modules", JSON.stringify(["core"]));
form.append("accessible_campaigns", JSON.stringify([]));

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/users',
  method: 'POST',
  headers: {
    ...form.getHeaders(),
    'Authorization': 'Bearer ' + token
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', e => console.error(e));
form.pipe(req);
