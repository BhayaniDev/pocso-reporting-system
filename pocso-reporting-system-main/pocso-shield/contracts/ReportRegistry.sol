// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ReportRegistry {

    enum Status { Pending, UnderReview, Escalated, Resolved }

    struct Report {
        bytes32 id;
        uint256 timestamp;
        string  ipfsHash;
        uint8   riskScore;
        Status  status;
        bool    exists;
    }

    struct AuditEntry {
        Status  from;
        Status  to;
        uint256 blockNumber;
        uint256 timestamp;
    }

    mapping(bytes32 => Report)        public reports;
    mapping(bytes32 => AuditEntry[])  public auditLog;
    bytes32[]                         public reportIds;
    bytes32                           public blocklistMerkleRoot;

    event ReportFiled(
        bytes32 indexed id,
        uint256 timestamp,
        uint8   riskScore,
        string  ipfsHash
    );
    event StatusUpdated(
        bytes32 indexed id,
        Status  oldStatus,
        Status  newStatus,
        uint256 blockNumber
    );
    event HighRiskAlert(bytes32 indexed id, uint8 riskScore);

    function fileReport(string calldata ipfsHash, uint8 riskScore) external returns (bytes32) {
        require(riskScore <= 100, "Score out of range");

        bytes32 id = keccak256(
            abi.encodePacked(block.timestamp, ipfsHash, block.prevrandao)
        );
        require(!reports[id].exists, "Duplicate report");

        Status initialStatus = riskScore >= 85 ? Status.Escalated : Status.Pending;

        reports[id] = Report({
            id:        id,
            timestamp: block.timestamp,
            ipfsHash:  ipfsHash,
            riskScore: riskScore,
            status:    initialStatus,
            exists:    true
        });

        reportIds.push(id);

        emit ReportFiled(id, block.timestamp, riskScore, ipfsHash);

        if (riskScore >= 85) {
            emit HighRiskAlert(id, riskScore);
        }

        return id;
    }

    function updateStatus(bytes32 id, Status newStatus) external {
        require(reports[id].exists, "Report not found");
        Status old = reports[id].status;
        reports[id].status = newStatus;

        auditLog[id].push(AuditEntry({
            from:        old,
            to:          newStatus,
            blockNumber: block.number,
            timestamp:   block.timestamp
        }));

        emit StatusUpdated(id, old, newStatus, block.number);
    }

    function getAuditLog(bytes32 id) external view returns (AuditEntry[] memory) {
        return auditLog[id];
    }

    function getAllReportIds() external view returns (bytes32[] memory) {
        return reportIds;
    }

    function getTotalReports() external view returns (uint256) {
        return reportIds.length;
    }

    function setBlocklistRoot(bytes32 root) external {
        blocklistMerkleRoot = root;
    }

    function isDomainFlagged(
        bytes32 domainHash,
        bytes32[] calldata proof
    ) external view returns (bool) {
        bytes32 computed = domainHash;
        for (uint i = 0; i < proof.length; i++) {
            computed = computed < proof[i]
                ? keccak256(abi.encodePacked(computed, proof[i]))
                : keccak256(abi.encodePacked(proof[i], computed));
        }
        return computed == blocklistMerkleRoot;
    }
}
