import { network } from "hardhat";

const { ethers } = await network.connect();

const CONTRACT_ADDRESS =
  "0x751a9C1b07E4Ccb0BdA81aC4721B094FB9B3ca39";

const DISTRIBUTOR =
  "0xF1EFf0ebCbC18cD0Cc47d96eC70a66429f0501aB";

const PHARMACY =
  "0x16eD08ef21eD0ff6fdfbFa72f244378A890544eA";

const [admin] = await ethers.getSigners();

const contract = await ethers.getContractAt(
  "DrugSupplyChain",
  CONTRACT_ADDRESS
);

console.log("Admin:", await admin.getAddress());

console.log("\nGranting distributor role...");

const distributorTx = await contract.addDistributor(DISTRIBUTOR);
await distributorTx.wait();

console.log("Distributor role granted.");

console.log("\nGranting pharmacy role...");

const pharmacyTx = await contract.addPharmacy(PHARMACY);
await pharmacyTx.wait();

console.log("Pharmacy role granted.");

console.log("\nChecking roles...");

console.log(
  "Distributor role:",
  await contract.hasRole(
    await contract.DISTRIBUTOR_ROLE(),
    DISTRIBUTOR
  )
);

console.log(
  "Pharmacy role:",
  await contract.hasRole(
    await contract.PHARMACY_ROLE(),
    PHARMACY
  )
);
