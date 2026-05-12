const fs = require('fs');
const path = require('path');

async function test() {
    const filePath = path.join(__dirname, 'test.txt');
    const txtContent = "1234567890\n0987654321\ntest\0withnull\n";
    fs.writeFileSync(filePath, txtContent);

    const formData = new FormData();
    const blob = new Blob([txtContent], { type: 'text/plain' });
    formData.append('file', blob, 'test.txt');
    formData.append('session_id', 'd8d0ac47-2a21-46c6-a734-e18a34b6b0f6');

    try {
        const response = await fetch('http://localhost:5000/api/jobs/upload-fresh', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', data);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        fs.unlinkSync(filePath);
    }
}

test();
