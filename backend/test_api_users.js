const jwt = require("jsonwebtoken");
const http = require("http");

const payload = {
  id: 1,
  role: "super_admin",
};

// I need the JWT_SECRET from .env
require('dotenv').config({ path: './.env' });
const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

const data = JSON.stringify({
  first_name: 'Test',
  last_name: 'User',
  email: 'test' + Date.now() + '@example.com',
  password: 'password123',
  role: 'admin',
  accessible_modules: ['core'],
  accessible_campaigns: []
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'Authorization': 'Bearer ' + token
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
