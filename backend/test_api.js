const jwt = require("jsonwebtoken");

const secret = "6cff741d00830de6f12ccfaf043362014779c065d3a5a6c912d19a2a1455cb691f8495d5dfbad56a3e97d55c56b756fae8cc7c7cc3135f25f6abc9136425846e";
const token = jwt.sign({ id: 1, role: "super_admin" }, secret);

(async () => {
  try {
    const payload = {
        bookingReferenceNo: 'EO-FL-FLT', type: '', unitNo: '', size: '', name: 'Test', fatherOrHusbandName: '', cnic: '', presentAddress: '', permanentAddress: '', residentialTel: '', mobileNo: '', email: '', nominee1Name: '', nominee1Relation: '', nominee1Cnic: '', nominee1Mobile: '', nominee2Name: '', nominee2Relation: '', nominee2Cnic: '', nominee2Mobile: '',
        totalPrice: '', discount: '', netPrice: '', downPayment: '', possessionPayment: '', installmentsCount: '24 Months', perMonthInstallment: '', month: '', otherCharges: 'Nill', location: 'Elite One Tower, Plot 30, Block A, Faisal Margalla city, Islamabad', paymentDate: '', witness1Name: '', witness1Relation: '', witness1Cnic: '', witness1Date: '', witness2Name: '', witness2Relation: '', witness2Cnic: '', witness2Date: ''
    };
    
    const res = await fetch("http://localhost:5000/api/clients", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (err) {
    console.error("ERROR:", err.message);
  }
})();
