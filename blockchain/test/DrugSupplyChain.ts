import { expect } from "chai";
import { network } from "hardhat";

describe("DrugSupplyChain", function () {

  async function deployContract() {
    const { ethers } = await network.connect();

    const [admin, manufacturer, distributor, pharmacy, stranger] =
      await ethers.getSigners();

    const contract = await ethers.deployContract("DrugSupplyChain");

    await contract.waitForDeployment();

    return {
      contract,
      admin,
      manufacturer,
      distributor,
      pharmacy,
      stranger,
    };
  }

  // ==========================================
  // DEPLOYMENT
  // ==========================================

  describe("Deployment", function () {

    it("should give the deployer the admin role", async function () {

      const { contract, admin } = await deployContract();

      const DEFAULT_ADMIN_ROLE =
        await contract.DEFAULT_ADMIN_ROLE();

      expect(
        await contract.hasRole(
          DEFAULT_ADMIN_ROLE,
          admin.address
        )
      ).to.equal(true);
    });


    it("should give the deployer the manufacturer role", async function () {

      const { contract, admin } = await deployContract();

      const MANUFACTURER_ROLE =
        await contract.MANUFACTURER_ROLE();

      expect(
        await contract.hasRole(
          MANUFACTURER_ROLE,
          admin.address
        )
      ).to.equal(true);
    });
    it("should allow the admin to add a distributor", async function () {

      const { contract, admin, distributor } =
        await deployContract();

      await contract
        .connect(admin)
        .addDistributor(distributor.address);

      const DISTRIBUTOR_ROLE =
        await contract.DISTRIBUTOR_ROLE();

      expect(
        await contract.hasRole(
          DISTRIBUTOR_ROLE,
          distributor.address
        )
      ).to.equal(true);
    });


    it("should allow the admin to add a pharmacy", async function () {

      const { contract, admin, pharmacy } =
        await deployContract();

      await contract
        .connect(admin)
        .addPharmacy(pharmacy.address);

      const PHARMACY_ROLE =
        await contract.PHARMACY_ROLE();

      expect(
        await contract.hasRole(
          PHARMACY_ROLE,
          pharmacy.address
        )
      ).to.equal(true);
    });


    it("should allow the admin to add another manufacturer", async function () {

      const { contract, admin, manufacturer } =
        await deployContract();

      await contract
        .connect(admin)
        .addManufacturer(manufacturer.address);

      const MANUFACTURER_ROLE =
        await contract.MANUFACTURER_ROLE();

      expect(
        await contract.hasRole(
          MANUFACTURER_ROLE,
          manufacturer.address
        )
      ).to.equal(true);
    });
  });


  // ==========================================
  // BATCH REGISTRATION
  // ==========================================

  describe("Batch Registration", function () {

    it("should allow the manufacturer to register a batch", async function () {

      const { contract } = await deployContract();

      const now = Math.floor(Date.now() / 1000);

      const manufacturingDate = now;

      const expiryDate =
        now + (60 * 60 * 24 * 365 * 2);

      await expect(
        contract.registerBatch(
          "MED-001",
          "Paracetamol 500mg",
          "ABC Pharmaceuticals",
          manufacturingDate,
          expiryDate,
          5000
        )
      ).to.emit(contract, "BatchRegistered");
    });


    it("should reject duplicate batch IDs", async function () {

      const { contract } = await deployContract();

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-001",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      await expect(
        contract.registerBatch(
          "MED-001",
          "Amoxicillin 500mg",
          "XYZ Pharmaceuticals",
          now,
          now + 100000,
          3000
        )
      ).to.be.revertedWith("Batch already exists");
    });


    it("should reject zero quantity", async function () {

      const { contract } = await deployContract();

      const now = Math.floor(Date.now() / 1000);

      await expect(
        contract.registerBatch(
          "MED-002",
          "Paracetamol 500mg",
          "ABC Pharmaceuticals",
          now,
          now + 100000,
          0
        )
      ).to.be.revertedWith(
        "Quantity must be greater than zero"
      );
    });


    it("should reject an invalid expiry date", async function () {

      const { contract } = await deployContract();

      const now = Math.floor(Date.now() / 1000);

      await expect(
        contract.registerBatch(
          "MED-003",
          "Paracetamol 500mg",
          "ABC Pharmaceuticals",
          now,
          now - 100,
          5000
        )
      ).to.be.revertedWith(
        "Invalid expiry date"
      );
    });

  });
  // ==========================================
  // BATCH TRANSFER
  // ==========================================

  describe("Batch Transfer", function () {

    it("should allow a manufacturer to transfer a batch to a distributor", async function () {

      const {
        contract,
        admin,
        distributor
      } = await deployContract();

      await contract
        .connect(admin)
        .addDistributor(distributor.address);

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-100",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      await expect(
        contract.transferBatch(
          "MED-100",
          distributor.address
        )
      ).to.emit(contract, "BatchTransferred");
    });


    it("should reject transfer to an address without a valid role", async function () {

      const {
        contract,
        stranger
      } = await deployContract();

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-101",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      await expect(
        contract.transferBatch(
          "MED-101",
          stranger.address
        )
      ).to.be.revertedWith(
        "Receiver has no valid role"
      );
    });


    it("should reject transfer by someone who is not the current owner", async function () {

      const {
        contract,
        admin,
        distributor
      } = await deployContract();

      await contract
        .connect(admin)
        .addDistributor(distributor.address);

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-102",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      await expect(
        contract
          .connect(distributor)
          .transferBatch(
            "MED-102",
            distributor.address
          )
      ).to.be.revertedWith(
        "Not the current owner"
      );
    });


    it("should allow a distributor to transfer a batch to a pharmacy", async function () {

      const {
        contract,
        admin,
        distributor,
        pharmacy
      } = await deployContract();

      await contract
        .connect(admin)
        .addDistributor(distributor.address);

      await contract
        .connect(admin)
        .addPharmacy(pharmacy.address);

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-103",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      await contract.transferBatch(
        "MED-103",
        distributor.address
      );

      await expect(
        contract
          .connect(distributor)
          .transferBatch(
            "MED-103",
            pharmacy.address
          )
      ).to.emit(contract, "BatchTransferred");
    });

  });
  // ==========================================
  // BATCH RECEIVE
  // ==========================================

  describe("Batch Receive", function () {

    it("should allow the current owner to receive a batch", async function () {

      const {
        contract,
        admin,
        distributor
      } = await deployContract();

      await contract
        .connect(admin)
        .addDistributor(distributor.address);

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-200",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      await contract.transferBatch(
        "MED-200",
        distributor.address
      );

      await expect(
        contract
          .connect(distributor)
          .receiveBatch("MED-200")
      ).to.emit(contract, "BatchReceived");
    });


    it("should reject receiving a non-existent batch", async function () {

      const { contract, admin } =
        await deployContract();

      await expect(
        contract
          .connect(admin)
          .receiveBatch("UNKNOWN-001")
      ).to.be.revertedWith(
        "Batch does not exist"
      );
    });


    it("should reject receiving a batch by someone who is not the current owner", async function () {

      const {
        contract,
        admin,
        distributor,
        stranger
      } = await deployContract();

      await contract
        .connect(admin)
        .addDistributor(distributor.address);

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-201",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      await contract.transferBatch(
        "MED-201",
        distributor.address
      );

      await expect(
        contract
          .connect(stranger)
          .receiveBatch("MED-201")
      ).to.be.revertedWith(
        "Not the current owner"
      );
    });

  });
  // ==========================================
  // BATCH LOOKUP
  // ==========================================

  describe("Batch Lookup", function () {

    it("should return the details of an existing batch", async function () {

      const { contract, admin } =
        await deployContract();

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-300",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      const batch =
        await contract.getBatch("MED-300");

      expect(batch.batchId).to.equal("MED-300");
      expect(batch.medicineName).to.equal(
        "Paracetamol 500mg"
      );
      expect(batch.manufacturer).to.equal(
        "ABC Pharmaceuticals"
      );
      expect(batch.quantity).to.equal(5000n);
      expect(batch.currentOwner).to.equal(
        admin.address
      );
      expect(batch.exists).to.equal(true);
    });


    it("should reject lookup of a non-existent batch", async function () {

      const { contract } =
        await deployContract();

      await expect(
        contract.getBatch("UNKNOWN-300")
      ).to.be.revertedWith(
        "Batch does not exist"
      );
    });

  });
  // ==========================================
  // BATCH VERIFICATION
  // ==========================================

  describe("Batch Verification", function () {

    it("should verify an active batch as authentic", async function () {

      const { contract } =
        await deployContract();

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-400",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      const result =
        await contract.verifyBatch("MED-400");

      expect(result[0]).to.equal(true);  // exists
      expect(result[1]).to.equal(true);  // authentic
      expect(result[2]).to.equal(false); // expired
      expect(result[3]).to.equal(false); // recalled
    });


    it("should identify an unknown batch", async function () {

      const { contract } =
        await deployContract();

      const result =
        await contract.verifyBatch("FAKE-400");

      expect(result[0]).to.equal(false); // exists
      expect(result[1]).to.equal(false); // authentic
      expect(result[2]).to.equal(false); // expired
      expect(result[3]).to.equal(false); // recalled
    });


    it("should identify an expired batch as not authentic", async function () {

      const { contract } =
        await deployContract();

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-401",
        "Expired Medicine",
        "ABC Pharmaceuticals",
        now - 200000,
        now - 100000,
        5000
      );

      const result =
        await contract.verifyBatch("MED-401");

      expect(result[0]).to.equal(true);  // exists
      expect(result[1]).to.equal(false); // authentic
      expect(result[2]).to.equal(true);  // expired
      expect(result[3]).to.equal(false); // recalled
    });


    it("should identify a recalled batch as not authentic", async function () {

      const { contract } =
        await deployContract();

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-402",
        "Recalled Medicine",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      // Recall functionality will be added next.
      // For now this test is intentionally not included.
    });

  });
  // ==========================================
  // BATCH RECALL
  // ==========================================

  describe("Batch Recall", function () {

    it("should allow the manufacturer to recall a batch", async function () {

      const { contract, admin } =
        await deployContract();

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-500",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      await expect(
        contract
          .connect(admin)
          .recallBatch("MED-500")
      ).to.emit(contract, "BatchRecalled");
    });


    it("should reject recall by a non-manufacturer", async function () {

  const {
    contract,
    admin,
    distributor
  } = await deployContract();

  await contract
    .connect(admin)
    .addDistributor(distributor.address);

  const now = Math.floor(Date.now() / 1000);

  await contract.registerBatch(
    "MED-501",
    "Paracetamol 500mg",
    "ABC Pharmaceuticals",
    now,
    now + 100000,
    5000
  );

  await expect(
    contract
      .connect(distributor)
      .recallBatch("MED-501")
  ).to.be.revertedWithCustomError(
    contract,
    "AccessControlUnauthorizedAccount"
  );
});


    it("should reject recall of a non-existent batch", async function () {

      const { contract, admin } =
        await deployContract();

      await expect(
        contract
          .connect(admin)
          .recallBatch("UNKNOWN-500")
      ).to.be.revertedWith(
        "Batch does not exist"
      );
    });


    it("should reject recalling an already recalled batch", async function () {

      const { contract, admin } =
        await deployContract();

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-502",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      await contract
        .connect(admin)
        .recallBatch("MED-502");

      await expect(
        contract
          .connect(admin)
          .recallBatch("MED-502")
      ).to.be.revertedWith(
        "Batch already recalled"
      );
    });


    it("should verify a recalled batch as not authentic", async function () {

      const { contract, admin } =
        await deployContract();

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-503",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      await contract
        .connect(admin)
        .recallBatch("MED-503");

      const result =
        await contract.verifyBatch("MED-503");

      expect(result[0]).to.equal(true);  // exists
      expect(result[1]).to.equal(false); // authentic
      expect(result[2]).to.equal(false); // expired
      expect(result[3]).to.equal(true);  // recalled
    });

  });
  // ==========================================
  // BATCH JOURNEY
  // ==========================================

  describe("Batch Journey", function () {

    it("should record the manufacturing event in the journey", async function () {

      const { contract, admin } =
        await deployContract();

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-600",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      const journey =
        await contract.getBatchJourney("MED-600");

      expect(journey.length).to.equal(1);
      expect(journey[0].from).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
      expect(journey[0].to).to.equal(
        admin.address
      );
      expect(journey[0].action).to.equal(
        "MANUFACTURED"
      );
    });


    it("should record transfer and receive events", async function () {

      const {
        contract,
        admin,
        distributor
      } = await deployContract();

      await contract
        .connect(admin)
        .addDistributor(distributor.address);

      const now = Math.floor(Date.now() / 1000);

      await contract.registerBatch(
        "MED-601",
        "Paracetamol 500mg",
        "ABC Pharmaceuticals",
        now,
        now + 100000,
        5000
      );

      await contract.transferBatch(
        "MED-601",
        distributor.address
      );

      await contract
        .connect(distributor)
        .receiveBatch("MED-601");

      const journey =
        await contract.getBatchJourney("MED-601");

      expect(journey.length).to.equal(3);

      expect(journey[0].action).to.equal(
        "MANUFACTURED"
      );

      expect(journey[1].action).to.equal(
        "TRANSFERRED"
      );

      expect(journey[2].action).to.equal(
        "RECEIVED"
      );

      expect(journey[1].to).to.equal(
        distributor.address
      );

      expect(journey[2].to).to.equal(
        distributor.address
      );
    });


    it("should reject journey lookup for a non-existent batch", async function () {

      const { contract } =
        await deployContract();

      await expect(
        contract.getBatchJourney("UNKNOWN-600")
      ).to.be.revertedWith(
        "Batch does not exist"
      );
    });

  });
});
