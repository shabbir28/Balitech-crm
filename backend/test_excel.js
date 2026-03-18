const xlsx = require('xlsx');
const { processFileBuffer } = require('./src/utils/fileProcessor');

async function testExcel() {
    // Create a workbook that mimics the user's Excel file
    const wb = xlsx.utils.book_new();
    const ws_data = [
        ['call_date', 'phone_number', 'status', 'user', 'full_name', 'campaign', 'vendor_lead_code', 'source_id', 'list_id', 'gmt_offset', 'phone_code', 'phone_number_2', 'title'],
        ['2026-03-17', '6.12E+09', 'PDROP', 'VDAD', 'Outbound Auto Dial', '001', '', '30202', '-5', '1', '6124755524', 'mr'],
        ['2026-03-17', '8.32E+09', 'PDROP', 'VDAD', 'Outbound Auto Dial', '001', '', '30202', '-7', '1', '8316372238', 'mr']
    ];
    const ws = xlsx.utils.aoa_to_sheet(ws_data);
    xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
    
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    console.log("Testing with Excel:");
    const records = await processFileBuffer(buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'test.xlsx');
    console.log(records);
}

testExcel();
