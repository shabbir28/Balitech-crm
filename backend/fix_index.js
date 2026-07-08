const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'index.js');
let content = fs.readFileSync(filePath); // Read as Buffer

// The file should end at line 290. Let's find the string "console.error(\"💥 Unhandled Rejection (non-fatal):\", reason);\r\n\r\n});"
const validEnd = Buffer.from("console.error(\"💥 Unhandled Rejection (non-fatal):\", reason);\n\n});");
const validEndWin = Buffer.from("console.error(\"💥 Unhandled Rejection (non-fatal):\", reason);\r\n\r\n});");

let contentStr = content.toString('utf8');
const index = contentStr.indexOf("console.error(\"💥 Unhandled Rejection (non-fatal):\", reason);");

if (index !== -1) {
    // keep everything up to the end of that block
    const endOfBlock = contentStr.indexOf("});", index) + 3;
    contentStr = contentStr.substring(0, endOfBlock) + "\n";
    fs.writeFileSync(filePath, contentStr, 'utf8');
    console.log("Fixed index.js");
} else {
    console.error("Could not find block to truncate at.");
}
