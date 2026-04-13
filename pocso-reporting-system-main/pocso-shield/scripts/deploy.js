const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;

  if (network !== "amoy") {
    throw new Error("You are NOT deploying to Amoy. Use --network amoy");
  }

  console.log(`\n🚀 Deploying ReportRegistry on ${network}...\n`);

  // Deploy contract
  const Registry = await hre.ethers.getContractFactory("ReportRegistry");
  const registry = await Registry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("✅ Contract deployed at:", address);

  // Transaction info
  const tx = registry.deploymentTransaction();
  const receipt = await tx.wait();

  console.log("📦 Tx Hash:", tx.hash);
  console.log("⛽ Gas Used:", receipt.gasUsed.toString());

  // =========================
  // SAVE DEPLOYMENT (IMPORTANT)
  // =========================

  const deploymentData = {
    contract: "ReportRegistry",
    address: address,
    network: network,
    chainId: 11155111,
    deployedAt: new Date().toISOString(),
  };

  const deployDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir);
  }

  fs.writeFileSync(
    path.join(deployDir, `${network}.json`),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("📁 Deployment saved in /deployments");

  // =========================
  // UPDATE BACKEND .ENV
  // =========================

  const envPath = path.join(__dirname, "../backend/.env");
  let envContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";

  if (envContent.includes("CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${address}`
    );
  } else {
    envContent += `\nCONTRACT_ADDRESS=${address}`;
  }

  try {
    fs.writeFileSync(envPath, envContent);
    console.log("🔗 Backend .env updated");
  } catch (err) {
    console.error("❌ Failed to update backend .env:", err);
  }

  // =========================
  // EXPORT ABI
  // =========================

  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/ReportRegistry.sol/ReportRegistry.json"
  );

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const abiPath = path.join(__dirname, "../backend/abi.json");

  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));

  console.log("📜 ABI exported to backend/abi.json");

  console.log("\n🎯 Deployment COMPLETE\n");
}

main().catch((error) => {
  console.error("❌ Deployment failed:\n", error);
  process.exit(1);
});