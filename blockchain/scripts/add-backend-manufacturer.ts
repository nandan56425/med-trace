import { network } from "hardhat";

const { ethers } = await network.connect();

const CONTRACT_ADDRESS =
  "0x751a9C1b07E4Ccb0BdA81aC4721B094FB9B3ca39";

const BACKEND_MANUFACTURER =
  "0x9f989C71Ce7CC4F7Ad4ACFdc49F45B50310a9167";

const [admin] = await ethers.getSigners();

const contract = await ethers.getContractAt(
  "DrugSupplyChain",
  CONTRACT_ADDRESS
);

console.log("Admin:", await admin.getAddress());

console.log("Backend manufacturer:", BACKEND_MANUFACTURER);

const manufacturerRole =
  await contract.MANUFACTURER_ROLE();

const alreadyHasRole =
  await contract.hasRole(
    manufacturerRole,
    BACKEND_MANUFACTURER
  );

console.log("Already has MANUFACTURER_ROLE:", alreadyHasRole);

if (!alreadyHasRole) {
  console.log("Granting MANUFACTURER_ROLE...");

  const tx = await contract.addManufacturer(
    BACKEND_MANUFACTURER
  );

  await tx.wait();

  console.log("MANUFACTURER_ROLE granted.");
}

const confirmed =
  await contract.hasRole(
    manufacturerRole,
    BACKEND_MANUFACTURER
  );

console.log(
  "Final MANUFACTURER_ROLE status:",
  confirmed
);
