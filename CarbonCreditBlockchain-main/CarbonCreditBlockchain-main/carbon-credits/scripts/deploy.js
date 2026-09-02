const hre = require("hardhat");

async function main() {
  const CarbonCredit = await hre.ethers.getContractFactory("CarbonCredit");
  console.log("Deploying CarbonCredit contract...");
  const carbonCredit = await CarbonCredit.deploy();

  // Support both ethers v5 and v6 deployment waiting methods
  if (typeof carbonCredit.deployed === "function") {
    await carbonCredit.deployed();
  } else if (typeof carbonCredit.waitForDeployment === "function") {
    await carbonCredit.waitForDeployment();
  }

  const address = carbonCredit.address || carbonCredit.target;
  console.log("CarbonCredit deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
