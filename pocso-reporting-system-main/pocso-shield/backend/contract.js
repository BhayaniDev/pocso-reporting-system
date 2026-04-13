// contract.js — ethers.js wrapper for ReportRegistry
const { ethers } = require("ethers");
const path       = require("path");
const fs         = require("fs");

// Load ABI from compiled artifact (generated after: npm run compile)
function loadABI() {
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/ReportRegistry.sol/ReportRegistry.json"
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      "ABI not found. Run `npm run compile` in the root directory first."
    );
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8")).abi;
}

let _contract = null;

function getContract() {
  if (_contract) return _contract;

  const ABI      = loadABI();
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  const wallet   = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  _contract      = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);
  return _contract;
}

async function fileReport(ipfsHash, riskScore) {
  const contract = getContract();
  const tx       = await contract.fileReport(ipfsHash, riskScore);
  const receipt  = await tx.wait();
  return tx.hash;
}

async function getAllReports() {
  const contract = getContract();
  const provider = contract.runner.provider;

  const filter = contract.filters.ReportFiled();
  const latestBlock = await provider.getBlockNumber();
  const step = 10;

  let events = [];

  for (let i = latestBlock - 100; i <= latestBlock; i += step) {
    const chunk = await contract.queryFilter(
      filter,
      i,
      Math.min(i + step - 1, latestBlock)
    );
    events.push(...chunk);
  }

  const reports = await Promise.all(
    events.map(async (e) => {
      const report   = await contract.reports(e.args.id);
      const auditRaw = await contract.getAuditLog(e.args.id);

      const STATUS_NAMES = ["Pending", "UnderReview", "Escalated", "Resolved"];

      return {
        id:          e.args.id,
        txHash:      e.transactionHash,
        blockNumber: e.blockNumber,
        timestamp:   Number(e.args.timestamp),
        ipfsHash:    e.args.ipfsHash,
        riskScore:   Number(e.args.riskScore),
        status:      STATUS_NAMES[Number(report.status)],
        auditLog:    auditRaw.map((a) => ({
          from:  STATUS_NAMES[Number(a.from)],
          to:    STATUS_NAMES[Number(a.to)],
          block: Number(a.blockNumber),
          time:  Number(a.timestamp),
        })),
      };
    })
  );

  return reports;
}

async function updateStatus(id, statusIndex) {
  const contract = getContract();
  const tx       = await contract.updateStatus(id, statusIndex);
  await tx.wait();
  return tx.hash;
}

module.exports = { fileReport, getAllReports, updateStatus };
