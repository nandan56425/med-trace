import { network } from "hardhat";

const { ethers } = await network.connect();

console.log("Deploying DrugSupplyChain...");

const contract = await ethers.deployContract("DrugSupplyChain");

await contract.waitForDeployment();

const address = await contract.getAddress();

console.log("DrugSupplyChain deployed to:");
console.log(address);
