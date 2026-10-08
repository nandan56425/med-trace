const http = require("http");

const data = JSON.stringify({
    batchId: "MED-002",
    medicineName: "Paracetamol 500mg",
    manufacturer: "ABC Pharma",
    quantity: 5000,
    manufacturingDate: "2026-10-09",
    expiryDate: "2028-10-09"
});

const options = {
    hostname: "localhost",
    port: 5000,
    path: "/api/batches",
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    let response = "";

    res.on("data", chunk => {
        response += chunk;
    });

    res.on("end", () => {
        console.log("Status:", res.statusCode);
        console.log("Response:", response);
    });
});

req.on("error", (error) => {
    console.error("Error:", error.message);
});

req.write(data);
req.end();