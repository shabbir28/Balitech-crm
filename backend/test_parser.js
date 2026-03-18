const fs = require('fs');
const { processFileBuffer } = require('./src/utils/fileProcessor');

async function test() {
    // Create a mock buffer of a CSV that looks like the screenshot
    const csvContent = `call_date,phone_number,status,user,full_name,campaign,vendor_lead_code,source_id,list_id,gmt_offset,phone_code,phone_number2,title
2026-03-17,6124755524,PDROP,VDAD,Outbound Auto Dial,001,,30202,-5,1,6124755524,mr
2026-03-17,8316372238,PDROP,VDAD,Outbound Auto Dial,001,,30202,-7,1,8316372238,mr
2026-03-17,4232011196,AB,VDAD,Outbound Auto Dial,001,,30202,-4,1,4232011196,mr
2026-03-17,9133343316,ADC,VDAD,Outbound Auto Dial,001,,30202,-5,1,9133343316,mr
`;
    console.log("Testing with CSV:");
    const records = await processFileBuffer(Buffer.from(csvContent), 'text/csv', 'test.csv');
    console.log(records);
}

test();
