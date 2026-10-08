import { network } from "hardhat";

const { ethers } = await network.connect();

const CONTRACT_ADDRESS =
  "0x751a9C1b07E4Ccb0BdA81aC4721B094FB9B3ca39";

const BATCH_ID = "MED-CB03-003";

const contract = await ethers.getContractAt(
  "DrugSupplyChain",
  CONTRACT_ADDRESS
);

const [manufacturer, distributor, pharmacy] =
  await ethers.getSigners();

console.log("Manufacturer:", await manufacturer.getAddress());
console.log("Distributor:", await distributor.getAddress());
console.log("Pharmacy:", await pharmacy.getAddress());

console.log("\n--- Checking roles ---");

console.log(
  "Manufacturer role:",
  await contract.hasRole(
    await contract.MANUFACTURER_ROLE(),
    await manufacturer.getAddress()
  )
);

console.log(
  "Distributor role:",
  await contract.hasRole(
    await contract.DISTRIBUTOR_ROLE(),
    await distributor.getAddress()
  )
);

console.log(
  "Pharmacy role:",
  await contract.hasRole(
    await contract.PHARMACY_ROLE(),
    await pharmacy.getAddress()
  )
);

console.log("\n--- Registering new batch ---");

const now = Math.floor(Date.now() / 1000);

const registerTx = await contract
  .connect(manufacturer)
  .registerBatch(
    BATCH_ID,
    "Amoxicillin 500mg",
    "CB03 Pharmaceuticals",
    now,
    now + 60 * 60 * 24 * 365,
    5000
  );

await registerTx.wait();

console.log("Batch registered:", BATCH_ID);

console.log("\n--- Current batch owner ---");

let batch = await contract.getBatch(BATCH_ID);

console.log("Batch:", batch.batchId);
console.log("Medicine:", batch.medicineName);
console.log("Current owner:", batch.currentOwner);

console.log("Batch:", batch.batchId);
console.log("Medicine:", batch.medicineName);
console.log("Current owner:", batch.currentOwner);

console.log("\n--- Manufacturer → Distributor ---");

const transferToDistributorTx = await contract
  .connect(manufacturer)
  .transferBatch(
    BATCH_ID,
    await distributor.getAddress()
  );

await transferToDistributorTx.wait();

console.log("Batch transferred to distributor.");

console.log("\n--- Distributor receives batch ---");

const distributorReceiveTx = await contract
  .connect(distributor)
  .receiveBatch(BATCH_ID);

await distributorReceiveTx.wait();

console.log("Distributor received batch.");

console.log("\n--- Distributor → Pharmacy ---");

const transferToPharmacyTx = await contract
  .connect(distributor)
  .transferBatch(
    BATCH_ID,
    await pharmacy.getAddress()
  );

await transferToPharmacyTx.wait();

console.log("Batch transferred to pharmacy.");

console.log("\n--- Pharmacy receives batch ---");

const pharmacyReceiveTx = await contract
  .connect(pharmacy)
  .receiveBatch(BATCH_ID);

await pharmacyReceiveTx.wait();

console.log("Pharmacy received batch.");

console.log("\n--- Final batch state ---");

batch = await contract.getBatch(BATCH_ID);

console.log("Current owner:", batch.currentOwner);

console.log("\n--- Verification ---");

const verification =
  await contract.verifyBatch(BATCH_ID);

console.log("Exists:", verification[0]);
console.log("Authentic:", verification[1]);
console.log("Expired:", verification[2]);
console.log("Recalled:", verification[3]);

console.log("\n--- Blockchain Journey ---");

const journey =
  await contract.getBatchJourney(BATCH_ID);

for (let i = 0; i < journey.length; i++) {
  console.log(
    `${i + 1}. ${journey[i].action}` +
    ` | From: ${journey[i].from}` +
    ` | To: ${journey[i].to}` +
    ` | Time: ${journey[i].timestamp}`
  );
}