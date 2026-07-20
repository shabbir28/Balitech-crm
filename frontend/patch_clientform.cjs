const fs = require('fs');
const file = 'd:/Bpo crm/frontend/src/pages/Clients.jsx';
let content = fs.readFileSync(file, 'utf-8');

// Find ClientForm declaration
const startStr = 'const ClientForm = ({ onSubmit }) => (';
const startIdx = content.indexOf(startStr);
if (startIdx === -1) {
    console.log('ClientForm not found');
    process.exit(1);
}

// Find end of ClientForm declaration
const endStr = '</form>\r\n    );'; // Wait, let's just find </form> and the next );
let formEndIdx = content.indexOf('</form>', startIdx);
let endIdx = content.indexOf(');', formEndIdx) + 2;

// Extract body and remove declaration
let formBody = content.substring(startIdx + startStr.length, endIdx - 2).trim(); // remove );

// Replace onSubmit={onSubmit} with onSubmit={modal === \'edit\' ? handleEdit : handleAdd}
formBody = formBody.replace('onSubmit={onSubmit}', 'onSubmit={modal === \\'edit\\' ? handleEdit : handleAdd}');

// Remove declaration
content = content.substring(0, startIdx) + content.substring(endIdx);

// Replace usage
content = content.replace('<ClientForm onSubmit={modal === \\'edit\\' ? handleEdit : handleAdd} />', formBody);
content = content.replace('<ClientForm onSubmit={modal === " edit\ ? handleEdit : handleAdd} />', formBody);

fs.writeFileSync(file, content);
console.log('ClientForm inlined successfully');
