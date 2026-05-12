const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testTxtUpload() {
    const form = new FormData();
    // Create a dummy TXT file
    const txtContent = "1234567890\n0987654321\ntest\0withnull\n";
    const filePath = path.join(__dirname, 'test.txt');
    fs.writeFileSync(filePath, txtContent);

    form.append('file', fs.createReadStream(filePath));
    form.append('session_id', 'd8d0ac47-2a21-46c6-a734-e18a34b6b0f6');

    try {
        console.log('Attempting .txt upload to http://localhost:5000/api/jobs/upload-fresh...');
        const response = await axios.post('http://localhost:5000/api/jobs/upload-fresh', form, {
            headers: {
                ...form.getHeaders()
            }
        });
        console.log('Response:', response.data);
    } catch (err) {
        if (err.response) {
            console.error('Upload Failed:', err.response.status, err.response.data);
        } else {
            console.error('Error:', err.message);
        }
    } finally {
        fs.unlinkSync(filePath);
    }
}

testTxtUpload();
