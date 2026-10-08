// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract DrugSupplyChain is AccessControl {

    bytes32 public constant MANUFACTURER_ROLE =
        keccak256("MANUFACTURER_ROLE");

    bytes32 public constant DISTRIBUTOR_ROLE =
        keccak256("DISTRIBUTOR_ROLE");

    bytes32 public constant PHARMACY_ROLE =
        keccak256("PHARMACY_ROLE");

    enum BatchStatus {
        ACTIVE,
        RECALLED
    }

    struct Batch {
        string batchId;
        string medicineName;
        string manufacturer;
        uint256 manufacturingDate;
        uint256 expiryDate;
        uint256 quantity;
        address currentOwner;
        BatchStatus status;
        bool exists;
    }

    struct Handoff {
        address from;
        address to;
        string action;
        uint256 timestamp;
    }

    mapping(string => Batch) private batches;
    mapping(string => Handoff[]) private batchJourney;

    event BatchRegistered(
        string batchId,
        string medicineName,
        address manufacturer,
        uint256 timestamp
    );

    event BatchTransferred(
        string batchId,
        address from,
        address to,
        uint256 timestamp
    );

    event BatchReceived(
        string batchId,
        address receiver,
        uint256 timestamp
    );

    event BatchRecalled(
        string batchId,
        address recalledBy,
        uint256 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANUFACTURER_ROLE, msg.sender);
    }

    function registerBatch(
        string memory batchId,
        string memory medicineName,
        string memory manufacturer,
        uint256 manufacturingDate,
        uint256 expiryDate,
        uint256 quantity
    )
        external
        onlyRole(MANUFACTURER_ROLE)
    {
        require(!batches[batchId].exists, "Batch already exists");
        require(bytes(batchId).length > 0, "Invalid batch ID");
        require(expiryDate > manufacturingDate, "Invalid expiry date");
        require(quantity > 0, "Quantity must be greater than zero");

        batches[batchId] = Batch({
            batchId: batchId,
            medicineName: medicineName,
            manufacturer: manufacturer,
            manufacturingDate: manufacturingDate,
            expiryDate: expiryDate,
            quantity: quantity,
            currentOwner: msg.sender,
            status: BatchStatus.ACTIVE,
            exists: true
        });

        batchJourney[batchId].push(
            Handoff({
                from: address(0),
                to: msg.sender,
                action: "MANUFACTURED",
                timestamp: block.timestamp
            })
        );

        emit BatchRegistered(
            batchId,
            medicineName,
            msg.sender,
            block.timestamp
        );
    }
function transferBatch(
    string memory batchId,
    address to
)
    external
{
    require(batches[batchId].exists, "Batch does not exist");
    require(
        batches[batchId].currentOwner == msg.sender,
        "Not the current owner"
    );
    require(to != address(0), "Invalid receiver");

    bool validReceiver =
        hasRole(DISTRIBUTOR_ROLE, to) ||
        hasRole(PHARMACY_ROLE, to);

    require(validReceiver, "Receiver has no valid role");

    address previousOwner = batches[batchId].currentOwner;

    batches[batchId].currentOwner = to;

    batchJourney[batchId].push(
        Handoff({
            from: previousOwner,
            to: to,
            action: "TRANSFERRED",
            timestamp: block.timestamp
        })
    );

    emit BatchTransferred(
        batchId,
        previousOwner,
        to,
        block.timestamp
    );
}
function receiveBatch(
    string memory batchId
)
    external
{
    require(batches[batchId].exists, "Batch does not exist");

    require(
        batches[batchId].currentOwner == msg.sender,
        "Not the current owner"
    );

    batchJourney[batchId].push(
        Handoff({
            from: msg.sender,
            to: msg.sender,
            action: "RECEIVED",
            timestamp: block.timestamp
        })
    );

    emit BatchReceived(
        batchId,
        msg.sender,
        block.timestamp
    );
}
function getBatch(
    string memory batchId
)
    external
    view
    returns (Batch memory)
{
    require(batches[batchId].exists, "Batch does not exist");

    return batches[batchId];
}
function verifyBatch(
    string memory batchId
)
    external
    view
    returns (
        bool exists,
        bool authentic,
        bool expired,
        bool recalled
    )
{
    if (!batches[batchId].exists) {
        return (false, false, false, false);
    }

    bool isExpired =
        block.timestamp > batches[batchId].expiryDate;

    bool isRecalled =
        batches[batchId].status == BatchStatus.RECALLED;

    bool isAuthentic =
        !isExpired && !isRecalled;

    return (
        true,
        isAuthentic,
        isExpired,
        isRecalled
    );
}
function getBatchJourney(
    string memory batchId
)
    external
    view
    returns (Handoff[] memory)
{
    require(
        batches[batchId].exists,
        "Batch does not exist"
    );

    return batchJourney[batchId];
}
function recallBatch(
    string memory batchId
)
    external
    onlyRole(MANUFACTURER_ROLE)
{
    require(
        batches[batchId].exists,
        "Batch does not exist"
    );

    require(
        batches[batchId].status == BatchStatus.ACTIVE,
        "Batch already recalled"
    );

    batches[batchId].status = BatchStatus.RECALLED;

    emit BatchRecalled(
        batchId,
        msg.sender,
        block.timestamp
    );
}
    function addManufacturer(address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(MANUFACTURER_ROLE, account);
    }

    function addDistributor(address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(DISTRIBUTOR_ROLE, account);
    }

    function addPharmacy(address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        grantRole(PHARMACY_ROLE, account);
    }
}
