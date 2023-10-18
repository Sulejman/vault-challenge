// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title MockLendingProtocol
 * @dev This is a mock lending protocol for demonstration purposes.
 */
contract MockLendingProtocol {
    mapping(address => uint256) public balances;
    IERC20 public token;

    /**
     * @dev Initializes the contract with a given token.
     * @param _token Address of the ERC20 token.
     */
    constructor(IERC20 _token) {
        token = _token;
    }

    /**
     * @dev Deposit profit for a given account.
     * @param amount Amount to deposit as profit.
     * @param account Address of the beneficiary.
     */
    function depositProfit(uint256 amount, address account) public {
        balances[account] += amount;
    }

    /**
     * @dev Supply tokens to the lending protocol.
     * @param amount Amount of tokens to supply.
     * @return true if successful.
     */
    function supply(uint256 amount) external returns (bool) {
        token.transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        return true;
    }

    /**
     * @dev Withdraw tokens from the lending protocol.
     * @param amount Amount of tokens to withdraw.
     * @return true if successful.
     */
    function withdraw(uint256 amount) external returns (bool) {
        token.transfer(msg.sender, amount);
        balances[msg.sender] -= amount;
        return true;
    }

    /**
     * @dev Get the balance of an account.
     * @param account Address of the account.
     * @return Balance of the account in the lending protocol.
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
}

/**
 * @title Vault
 * @dev A vault contract that interacts with a mock lending protocol.
 */
contract Vault is ERC20Upgradeable, OwnableUpgradeable, AccessControlUpgradeable {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    MockLendingProtocol public lendingProtocol;
    IERC20 public token;

    /**
     * @dev Initializes the vault with a given lending protocol and token.
     * @param _lendingProtocol Address of the mock lending protocol.
     * @param _token Address of the ERC20 token.
     */
    function initialize(MockLendingProtocol _lendingProtocol, IERC20 _token) public initializer {
        __ERC20_init("VaultToken", "vTKN");
        __Ownable_init(_msgSender());
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(MANAGER_ROLE, _msgSender());
        _grantRole(UPGRADER_ROLE, _msgSender());

        lendingProtocol = _lendingProtocol;
        token = _token;
    }

    /**
     * @dev Deposit tokens into the vault.
     * @param amount Amount of tokens to deposit.
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount should be greater than 0");
        uint256 totalTokens = token.balanceOf(address(this)) + lendingProtocol.balanceOf(address(this));
        uint256 issuingShares = (totalTokens == 0 || totalSupply() == 0) ? amount : amount * totalSupply() / totalTokens;
        _mint(_msgSender(), issuingShares);
        token.transferFrom(_msgSender(), address(this), amount);
    }

    /**
     * @dev Supply tokens from the vault to the lending protocol.
     * @param amount Amount of tokens to supply.
     */
    function supplyToLendingProtocol(uint256 amount) external onlyManager {
        token.approve(address(lendingProtocol), amount);
        lendingProtocol.supply(amount);
    }

    /**
     * @dev Withdraw tokens from the lending protocol to the vault.
     * @param amount Amount of tokens to withdraw.
     */
    function withdrawFromLendingProtocol(uint256 amount) external onlyManager {
        lendingProtocol.withdraw(amount);
    }

    /**
     * @dev Withdraw tokens from the vault based on shares.
     * @param shares Number of shares to withdraw against.
     */
    function withdraw(uint256 shares) external {
        require(shares > 0 && shares <= balanceOf(_msgSender()), "Invalid share amount");
        uint256 totalTokens = token.balanceOf(address(this)) + lendingProtocol.balanceOf(address(this));
        uint256 withdrawAmount = shares * totalTokens/ totalSupply();

//        if (withdrawAmount > 0) {
//            mockToken.transfer(_msgSender(), withdrawAmount);
//        }

        _burn(_msgSender(), shares);
        token.transfer(_msgSender(), withdrawAmount);
    }

    /**
     * @dev Grant the manager role to an account.
     * @param account Address of the account to be granted the role.
     */
    function grantManagerRole(address account) external {
        grantRole(MANAGER_ROLE, account);
    }

    /**
     * @dev Revoke the manager role from an account.
     * @param account Address of the account to have the role revoked.
     */
    function revokeManagerRole(address account) external {
        revokeRole(MANAGER_ROLE, account);
    }

    /**
     * @dev Override the transfer ownership function to grant the default admin role to the new owner.
     * @param newOwner Address of the new owner.
     */
    function transferOwnership(address newOwner) public virtual override onlyOwner {
        super.transferOwnership(newOwner);
        grantRole(DEFAULT_ADMIN_ROLE, newOwner);
    }

    function suppliedTokens() external view returns (uint256) {
        return token.balanceOf(address(this)) + lendingProtocol.balanceOf(address(this));
    }

    modifier onlyManager() {
        require(hasRole(MANAGER_ROLE, _msgSender()), "Not the contract manager");
        _;
    }
}
