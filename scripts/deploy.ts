import "@typechain/hardhat";
import "@nomicfoundation/hardhat-ethers";
import hre from "hardhat";
const {ethers} = hre;

async function main() {
    await deployVault();
}

async function deployVault() {
    const { upgrades } = hre;

    const MockLendingProtocol = await ethers.getContractFactory(
        "MockLendingProtocol"
    );
    const mockLendingProtocol = await MockLendingProtocol.deploy();
    const deployedMockLendingProtocol = await mockLendingProtocol.waitForDeployment();
    console.log(
        "MockLendingProtocol deployed to:",
        await deployedMockLendingProtocol.getAddress()
    );

    // Deploy Vault with MockLendingProtocol's address
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await upgrades.deployProxy(Vault, [
        await deployedMockLendingProtocol.getAddress(),
    ]);
    const deployedVault = await vault.waitForDeployment();
    console.log("Vault deployed to:", await deployedVault.getAddress());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
