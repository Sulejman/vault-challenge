import {ethers} from "hardhat";
import {expect} from "chai";
import {MockToken, MockLendingProtocol, Vault} from "../typechain-types";
import {Signer} from "ethers";

describe("Vault and LendingProtocol", function () {
    let mockToken: MockToken;
    let mockLendingProtocol: MockLendingProtocol;
    let vault: Vault;

    beforeEach(async function () {
        const MockTokenFactory = await ethers.getContractFactory("MockToken");
        mockToken = (await MockTokenFactory.deploy() as MockToken);
        await mockToken.waitForDeployment();

        const MockLendingProtocolFactory = await ethers.getContractFactory("MockLendingProtocol");
        mockLendingProtocol = (await MockLendingProtocolFactory.deploy(await mockToken.getAddress())) as MockLendingProtocol;
        await mockLendingProtocol.waitForDeployment();

        const VaultFactory = await ethers.getContractFactory("Vault");
        vault = (await VaultFactory.deploy() as Vault);
        await vault.waitForDeployment();
        await vault.initialize(await mockLendingProtocol.getAddress(), await mockToken.getAddress());
    });

    describe("Deposit into Vault", function () {
        it("Should deposit tokens into the Vault", async function () {
            const initialSupply = 1000;
            const [deployer] = await ethers.getSigners();
            await mockToken.mint(deployer.address, initialSupply);

            const amountToDeposit = 500;
            await mockToken.approve(await vault.getAddress(), amountToDeposit);
            await vault.deposit(amountToDeposit);

            const vaultBalance = await mockToken.balanceOf(await vault.getAddress());
            expect(vaultBalance).to.equal(amountToDeposit);
        });
    });

    describe("Supply to LendingProtocol", function () {
        it("Should supply tokens from Vault to LendingProtocol", async function () {
            const initialSupply = 1000;
            const [deployer] = await ethers.getSigners();
            await mockToken.mint(deployer.address, initialSupply);

            const amountToDeposit = 500;
            await mockToken.approve(await vault.getAddress(), amountToDeposit);
            await vault.deposit(amountToDeposit);

            const amountToSupply = 250;
            await vault.supplyToLendingProtocol(amountToSupply);

            const lendingProtocolBalance = await mockLendingProtocol.balanceOf(await vault.getAddress());
            expect(lendingProtocolBalance).to.equal(amountToSupply);
        });
    });

    describe("Withdrawal from Vault", function () {
        it("Should allow users to withdraw their tokens from the Vault", async function () {
            const initialSupply = 1000;
            const [deployer] = await ethers.getSigners();
            await mockToken.mint(deployer.address, initialSupply); // ACTION: Mint tokens for deployer

            const amountToDeposit = 500;
            await mockToken.approve(await vault.getAddress(), amountToDeposit);  // ACTION: Approve Vault to spend tokens
            await vault.deposit(amountToDeposit); // ACTION: Deposit tokens into Vault

            const amountToWithdraw = 250;
            await vault.withdraw(amountToWithdraw);  // ACTION: Withdraw tokens from Vault

            const deployerBalance = await mockToken.balanceOf(deployer.address);
            const expectedBalance = BigInt(initialSupply) - BigInt(amountToDeposit) + BigInt(amountToWithdraw);
            expect(deployerBalance.toString()).to.equal(expectedBalance.toString());
        });
    });

    describe("Withdraw from LendingProtocol", function () {
        it("Should allow users to withdraw their tokens from the LendingProtocol via the Vault", async function () {
            const initialSupply = 500;
            const [_, user] = await ethers.getSigners();
            await mockToken.mint(user.address, initialSupply);   // ACTION: Mint tokens for user

            const amountToDeposit = 500;
            await mockToken.connect(user).approve(await vault.getAddress(), amountToDeposit);
            await vault.connect(user).deposit(amountToDeposit);  // ACTION: User deposits tokens into Vault

            const amountToSupply = 250;
            await vault.supplyToLendingProtocol(amountToSupply); // ACTION: Vault supplies tokens to LendingProtocol

            const amountToWithdraw = 100;
            await vault.withdrawFromLendingProtocol(amountToWithdraw); // ACTION: User withdraws tokens from LendingProtocol via Vault
            await vault.connect(user).withdraw(amountToWithdraw); // ACTION: User withdraws tokens from Vault

            const userBalance = await mockToken.balanceOf(user.address);
            const expectedBalance = (BigInt(initialSupply) - BigInt(amountToDeposit)) + BigInt(amountToWithdraw);
            expect(userBalance.toString()).to.equal(expectedBalance.toString());
        });
    });


    describe("Approval Mechanisms", function () {
        it("Should not allow unauthorized users to call sensitive functions", async function () {
            const initialSupply = 1000;
            const [deployer, attacker] = await ethers.getSigners();
            await mockToken.mint(deployer.address, initialSupply);

            const amountToDeposit = 500;
            await mockToken.approve(await vault.getAddress(), amountToDeposit);
            await vault.deposit(amountToDeposit);

            // Assuming withdraw is a sensitive function that only the depositor can call
            await expect(vault.connect(attacker).withdraw(amountToDeposit)).to.be.revertedWith("Invalid share amount");
        });
    });

    describe("Multiple User Interactions", function() {
        let initialSupply = 1000;
        let users : Signer[], deployer;

        beforeEach(async function() {
            [deployer, ...users] = await ethers.getSigners();
            for (const user of users) {
                await mockToken.mint(await user.getAddress(), initialSupply);
            }
        });

        it("3 users deposited and 4th wants to deposit", async function() {
            for (let i = 0; i < 3; i++) {
                await mockToken.connect(users[i]).approve(await vault.getAddress(), initialSupply);
                await vault.connect(users[i]).deposit(initialSupply);
            }

            await mockToken.connect(users[3]).approve(await vault.getAddress(), initialSupply);
            await vault.connect(users[3]).deposit(initialSupply);

            for (let i = 0; i < 4; i++) {
                expect(await vault.balanceOf(await users[i].getAddress())).to.be.above(0);
            }
        });

        it("3 users deposited, 4th deposits and then withdraws", async function() {
            for (let i = 0; i < 3; i++) {
                await mockToken.connect(users[i]).approve(await vault.getAddress(), initialSupply);
                await vault.connect(users[i]).deposit(initialSupply);
            }

            await mockToken.connect(users[3]).approve(await vault.getAddress(), initialSupply);
            await vault.connect(users[3]).deposit(initialSupply);
            await vault.connect(users[3]).withdraw(initialSupply);

            expect(await mockToken.balanceOf(await users[3].getAddress())).to.equal(initialSupply);
            expect(await vault.balanceOf(await users[3].getAddress())).to.equal(0);
        });

        it("3 users at vault, profit in lending, one user withdraws after profit", async function() {
            const profit = 300;
            for (let i = 0; i < 3; i++) {
                await mockToken.connect(users[i]).approve(await vault.getAddress(), initialSupply);
                await vault.connect(users[i]).deposit(initialSupply);
            }

            await mockToken.mint(await mockLendingProtocol.getAddress(), profit);
            await mockLendingProtocol.depositProfit(profit * 3, await vault.getAddress()); // Distributing profits

            const userBalanceBefore = await mockToken.balanceOf(await users[0].getAddress());
            await vault.connect(users[0]).withdraw(await vault.balanceOf(await users[0].getAddress()));
            const userBalanceAfter = await mockToken.balanceOf(await users[0].getAddress());

            expect(userBalanceAfter - userBalanceBefore).to.be.above(initialSupply);
        });
    });

});

