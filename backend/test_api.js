fetch('http://localhost:5000/api/premium-vendors?counts=true')
    .then(res => res.json().then(data => ({status: res.status, data})))
    .then(({status, data}) => console.log("Status:", status, "Data:", data))
    .catch(err => console.error("Error:", err));
