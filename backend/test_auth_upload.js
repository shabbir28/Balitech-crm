const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET;
const payload = {
    id: 1,
    username: 'admin',
    role: 'super_admin'
};

const token = jwt.sign(payload, secret, { expiresIn: '1h' });

async function test() {
    const formData = new FormData();
    const txtContent = "1234567890\n0987654321\ntest\0withnull\n";
    const blob = new Blob([txtContent], { type: 'text/plain' });
    formData.append('file', blob, 'test.txt');
    formData.append('session_id', 'd8d0ac47-2a21-46c6-a734-e18a34b6b0f6');

    try {
        const response = await fetch('http://localhost:5000/api/jobs/upload-fresh', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', data);
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
