const { ethers } = require("ethers");
require("dotenv").config();

const contractABI = require("./DrugSupplyChain.json").abi;

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Backend wallet that signs blockchain transactions
const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY,
    provider
);

const contractAddress = process.env.CONTRACT_ADDRESS;

// Read-only contract
const contract = new ethers.Contract(
    contractAddress,
    contractABI,
    provider
);

// Contract connected to backend wallet for transactions
const contractWithSigner = new ethers.Contract(
    contractAddress,
    contractABI,
    wallet
);

console.log("Blockchain provider initialized");
console.log("Network: Ethereum Sepolia");
console.log("Contract:", contractAddress);
console.log("Backend wallet:", wallet.address);

module.exports = {
    provider,
    contract,
    contractWithSigner,
    wallet
};