// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CarbonCredit {
    struct Project {
        string metadataCID;
        address issuer;
        uint256 carbonReduction;
        uint256 verifiedAt;
        bytes32 evidenceHash;
        uint256 attestationCount;
        bool registered;
        bool verified;
    }

    struct Retirement {
        address account;
        uint256 tokenId;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(uint256 => Project) public projects;
    mapping(uint256 => mapping(address => uint256)) public balances;
    mapping(uint256 => uint256) public totalIssued;
    mapping(uint256 => Retirement) public retirements;

    uint256 public verificationThreshold = 3;
    uint256 public retirementCount = 0;

    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);

    function claimTestingRoles() external {
        // Mock implementation
    }

    function registerProject(uint256 tokenId, string calldata metadataCID) external {
        projects[tokenId].metadataCID = metadataCID;
        projects[tokenId].issuer = msg.sender;
        projects[tokenId].registered = true;
        projects[tokenId].verified = false;
    }

    function submitVerification(uint256 tokenId, uint256 carbonReduction, bytes32 evidenceHash) external {
        projects[tokenId].carbonReduction = carbonReduction;
        projects[tokenId].evidenceHash = evidenceHash;
        projects[tokenId].verified = true;
        projects[tokenId].verifiedAt = block.timestamp;
        
        // Auto-mint to issuer for simplicity in testing
        address issuer = projects[tokenId].issuer;
        balances[tokenId][issuer] += carbonReduction;
        totalIssued[tokenId] += carbonReduction;
        emit TransferSingle(msg.sender, address(0), issuer, tokenId, carbonReduction);
    }

    function mint(address recipient, uint256 tokenId, uint256 amount) external {
        balances[tokenId][recipient] += amount;
        totalIssued[tokenId] += amount;
        emit TransferSingle(msg.sender, address(0), recipient, tokenId, amount);
    }

    function retire(uint256 tokenId, uint256 amount) external returns (uint256 retirementId) {
        require(balances[tokenId][msg.sender] >= amount, "Insufficient balance");
        balances[tokenId][msg.sender] -= amount;
        
        retirementCount++;
        retirementId = retirementCount;
        
        retirements[retirementId] = Retirement({
            account: msg.sender,
            tokenId: tokenId,
            amount: amount,
            timestamp: block.timestamp
        });
    }

    function getBalance(address owner, uint256 tokenId) external view returns (uint256) {
        return balances[tokenId][owner];
    }

    function getProjectData(uint256 tokenId) external view returns (
        string memory metadataCID,
        address issuer,
        uint256 carbonReduction,
        uint256 verifiedAt,
        bytes32 evidenceHash,
        uint256 attestationCount,
        bool registered,
        bool verified
    ) {
        Project memory p = projects[tokenId];
        return (
            p.metadataCID,
            p.issuer,
            p.carbonReduction,
            p.verifiedAt,
            p.evidenceHash,
            p.attestationCount,
            p.registered,
            p.verified
        );
    }

    function getRetirementRecord(uint256 retirementId) external view returns (
        address account,
        uint256 tokenId,
        uint256 amount,
        uint256 timestamp
    ) {
        Retirement memory r = retirements[retirementId];
        return (r.account, r.tokenId, r.amount, r.timestamp);
    }

    function uri(uint256 tokenId) external view returns (string memory) {
        return string(abi.encodePacked("ipfs://", projects[tokenId].metadataCID));
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external {
        require(balances[id][from] >= value, "Insufficient balance");
        balances[id][from] -= value;
        balances[id][to] += value;
        emit TransferSingle(msg.sender, from, to, id, value);
    }
}
