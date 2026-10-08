const express = require("express");
const cors = require("cors");
require("dotenv").config();


const QRCode = require("qrcode");
const { provider, contract, contractWithSigner } = require("./blockchain");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "MEDTRACE Backend is running!"
    });
});

app.get("/api/blockchain", async (req, res) => {
    try {
        const network = await provider.getNetwork();

        res.json({
            connected: true,
            chainId: network.chainId.toString()
        });
    } catch (error) {
        res.status(500).json({
            connected: false,
            error: error.message
        });
    }
});

app.post("/api/batches", async (req, res) => {
    const {
        batchId,
        medicineName,
        manufacturer,
        quantity,
        manufacturingDate,
        expiryDate
    } = req.body;

    if (
        !batchId ||
        !medicineName ||
        !manufacturer ||
        quantity === undefined ||
        !manufacturingDate ||
        !expiryDate
    ) {
        return res.status(400).json({
            success: false,
            message: "All batch details are required"
        });
    }

    if (Number(quantity) <= 0) {
        return res.status(400).json({
            success: false,
            message: "Quantity must be greater than 0"
        });
    }

    const manufacturing = new Date(manufacturingDate);
    const expiry = new Date(expiryDate);

    if (
        isNaN(manufacturing.getTime()) ||
        isNaN(expiry.getTime())
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid manufacturing or expiry date"
        });
    }

    if (manufacturing >= expiry) {
        return res.status(400).json({
            success: false,
            message: "Expiry date must be after manufacturing date"
        });
    }



    try {
        // Convert dates to Unix timestamps for the smart contract
        const manufacturingTimestamp =
            Math.floor(manufacturing.getTime() / 1000);

        const expiryTimestamp =
            Math.floor(expiry.getTime() / 1000);

        // Register batch on blockchain
        const tx = await contractWithSigner.registerBatch(
            batchId,
            medicineName,
            manufacturer,
            manufacturingTimestamp,
            expiryTimestamp,
            Number(quantity)
        );

        console.log("Register transaction sent:", tx.hash);

        // Wait for blockchain confirmation
        const receipt = await tx.wait();

        console.log("Register transaction confirmed:", receipt.hash);

        const registeredBatch = await contract.getBatch(batchId);

const batchResponse = {
    batchId: registeredBatch.batchId,
    medicineName: registeredBatch.medicineName,
    manufacturer: registeredBatch.manufacturer,
    quantity: Number(registeredBatch.quantity),
    manufacturingDate: new Date(
        Number(registeredBatch.manufacturingDate) * 1000
    ).toISOString().split("T")[0],
    expiryDate: new Date(
        Number(registeredBatch.expiryDate) * 1000
    ).toISOString().split("T")[0],
    currentOwner: registeredBatch.currentOwner
};



        res.status(201).json({
            success: true,
            message: "Batch registered successfully on blockchain",
            transactionHash: receipt.hash,
            batch: batchResponse
        });

    } catch (error) {
        console.error("Blockchain registration failed:", error);

        res.status(500).json({
            success: false,
            message: "Blockchain registration failed",
            error: error.shortMessage || error.message
        });
    }
});

app.get("/api/batches/:batchId", async (req, res) => {
    const { batchId } = req.params;

    try {
        const batch = await contract.getBatch(batchId);

        res.json({
            success: true,
            batch: {
                batchId: batch.batchId,
                medicineName: batch.medicineName,
                manufacturer: batch.manufacturer,
                manufacturingDate: new Date(
                    Number(batch.manufacturingDate) * 1000
                ).toISOString().split("T")[0],
                expiryDate: new Date(
                    Number(batch.expiryDate) * 1000
                ).toISOString().split("T")[0],
                quantity: Number(batch.quantity),
                currentOwner: batch.currentOwner,
                recalled: batch.recalled
            }
        });

    } catch (error) {
        console.error("Blockchain batch lookup failed:", error);

        res.status(404).json({
            success: false,
            message: "Batch not found",
            error: error.shortMessage || error.message
        });
    }
});

app.get("/api/batches/:batchId/history", async (req, res) => {
    const { batchId } = req.params;

    try {
        const journey = await contract.getBatchJourney(batchId);

        res.json({
            success: true,
            batchId,
            history: journey.map(event => ({
                owner: event.owner,
                action: event.action,
                timestamp: new Date(
                    Number(event.timestamp) * 1000
                ).toISOString()
            }))
        });

    } catch (error) {
        console.error("Blockchain journey lookup failed:", error);

        res.status(404).json({
            success: false,
            message: "Batch history not found",
            error: error.shortMessage || error.message
        });
    }
});

app.get("/api/verify/:batchId", async (req, res) => {
    const { batchId } = req.params;

    try {
        const result = await contract.verifyBatch(batchId);

        const exists = result[0];
        const authentic = result[1];
        const expired = result[2];
        const recalled = result[3];

        if (!exists) {
            return res.status(404).json({
                success: false,
                verified: false,
                status: "UNREGISTERED",
                message: "Invalid or unregistered batch"
            });
        }

        if (recalled) {
            return res.json({
                success: true,
                verified: false,
                status: "RECALLED",
                message: "Batch has been recalled"
            });
        }

        if (expired) {
            return res.json({
                success: true,
                verified: false,
                status: "EXPIRED",
                message: "Batch has expired"
            });
        }

        res.json({
            success: true,
            verified: authentic,
            status: authentic ? "VALID" : "INVALID",
            message: authentic
                ? "Batch is authentic and valid"
                : "Batch verification failed"
        });

    } catch (error) {
        console.error("Blockchain verification failed:", error);

        res.status(500).json({
            success: false,
            verified: false,
            message: "Blockchain verification failed",
            error: error.shortMessage || error.message
        });
    }
});
app.get("/api/qr/:batchId", async (req, res) => {
    const { batchId } = req.params;

    try {
        // Check that batch exists on blockchain
        const batch = await contract.getBatch(batchId);

        if (!batch.batchId) {
            return res.status(404).json({
                success: false,
                message: "Batch not found"
            });
        }

        const verificationURL =
            `${process.env.BACKEND_URL}/api/verify/${batchId}`;

        const qrCode = await QRCode.toDataURL(verificationURL);

        res.json({
            success: true,
            batchId,
            verificationURL,
            qrCode
        });

    } catch (error) {
        console.error("QR generation failed:", error);

        res.status(500).json({
            success: false,
            message: "QR generation failed",
            error: error.shortMessage || error.message
        });
    }
});
app.post("/api/transfer", async (req, res) => {
    const { batchId, to } = req.body;

    if (!batchId || !to) {
        return res.status(400).json({
            success: false,
            message: "Batch ID and receiver address are required"
        });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
        return res.status(400).json({
            success: false,
            message: "Invalid receiver wallet address"
        });
    }

    try {
        // Check batch exists on blockchain
        const batch = await contract.getBatch(batchId);

        if (!batch.batchId) {
            return res.status(404).json({
                success: false,
                message: "Batch not found"
            });
        }

        // Backend wallet must be the current owner
        if (
            batch.currentOwner.toLowerCase() !==
            contractWithSigner.runner.address.toLowerCase()
        ) {
            return res.status(403).json({
                success: false,
                message: "Backend wallet is not the current owner"
            });
        }

        // Check current blockchain verification status
        const verification = await contract.verifyBatch(batchId);

        if (verification.recalled) {
            return res.status(400).json({
                success: false,
                message: "Recalled batches cannot be transferred"
            });
        }

        if (verification.expired) {
            return res.status(400).json({
                success: false,
                message: "Expired batches cannot be transferred"
            });
        }

        // Transfer ownership on blockchain
        const tx = await contractWithSigner.transferBatch(
            batchId,
            to
        );

        console.log("Transfer transaction sent:", tx.hash);

        const receipt = await tx.wait();

        console.log("Transfer transaction confirmed:", receipt.hash);

        res.json({
            success: true,
            message: "Batch transferred successfully on blockchain",
            transactionHash: receipt.hash,
            batchId,
            from: contractWithSigner.runner.address,
            to
        });

    } catch (error) {
        console.error("Blockchain transfer failed:", error);

        res.status(500).json({
            success: false,
            message: "Blockchain transfer failed",
            error: error.shortMessage || error.message
        });
    }
});


app.post("/api/receive", async (req, res) => {
    const { batchId } = req.body;

    if (!batchId) {
        return res.status(400).json({
            success: false,
            message: "Batch ID is required"
        });
    }

    try {
        const batch = await contract.getBatch(batchId);

        if (!batch.batchId) {
            return res.status(404).json({
                success: false,
                message: "Batch not found"
            });
        }

        const receiver = batch.currentOwner;

        // Backend signer must be the current owner/receiver
        if (
            receiver.toLowerCase() !==
            contractWithSigner.runner.address.toLowerCase()
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Current backend wallet is not the receiver. Receiver must sign the receive transaction."
            });
        }

        const verification = await contract.verifyBatch(batchId);

        if (verification.recalled) {
            return res.status(400).json({
                success: false,
                message: "Recalled batches cannot be received"
            });
        }

        const tx = await contractWithSigner.receiveBatch(batchId);

        console.log("Receive transaction sent:", tx.hash);

        const receipt = await tx.wait();

        console.log("Receive transaction confirmed:", receipt.hash);

        res.json({
            success: true,
            message: "Batch received successfully on blockchain",
            transactionHash: receipt.hash,
            batchId,
            receiver
        });

    } catch (error) {
        console.error("Blockchain receive failed:", error);

        res.status(500).json({
            success: false,
            message: "Blockchain receive failed",
            error: error.shortMessage || error.message
        });
    }
});

app.post("/api/recall", async (req, res) => {
    const { batchId } = req.body;

    if (!batchId) {
        return res.status(400).json({
            success: false,
            message: "Batch ID is required"
        });
    }

    try {
        const batch = await contract.getBatch(batchId);

        if (!batch.batchId) {
            return res.status(404).json({
                success: false,
                message: "Batch not found"
            });
        }

        const verification = await contract.verifyBatch(batchId);

        if (verification.recalled) {
            return res.status(400).json({
                success: false,
                message: "Batch is already recalled"
            });
        }

        const tx = await contractWithSigner.recallBatch(batchId);

        console.log("Recall transaction sent:", tx.hash);

        const receipt = await tx.wait();

        console.log("Recall transaction confirmed:", receipt.hash);

        res.json({
            success: true,
            message: "Batch recalled successfully on blockchain",
            transactionHash: receipt.hash,
            batchId
        });

    } catch (error) {
        console.error("Blockchain recall failed:", error);

        res.status(500).json({
            success: false,
            message: "Blockchain recall failed",
            error: error.shortMessage || error.message
        });
    }
});

console.log("TRANSFER ROUTE LOADED");
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`MEDTRACE backend running on port ${PORT}`);
});
