const jwt = require("jsonwebtoken");

const secret = "6cff741d00830de6f12ccfaf043362014779c065d3a5a6c912d19a2a1455cb691f8495d5dfbad56a3e97d55c56b756fae8cc7c7cc3135f25f6abc9136425846e";
const token = jwt.sign({ id: 1, role: "super_admin" }, secret);

(async () => {
  try {
    const payload = {
        name: 'Test',
        did: '',
        campaign_id: ''
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
