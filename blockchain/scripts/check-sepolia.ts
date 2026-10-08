import { network } from "hardhat";

const { ethers } = await network.connect();

const provider = ethers.provider;

const networkInfo = await provider.getNetwork();

console.log("Chain ID:", networkInfo.chainId.toString());

const [signer] = await ethers.getSigners();

console.log("Wallet:", await signer.getAddress());

const balance = await ethers.provider.getBalance(await signer.getAddress());

console.log("Balance:", ethers.formatEther(balance), "ETH");
