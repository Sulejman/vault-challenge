import {MockLendingProtocol, MockToken, Vault} from "../typechain-types";

export async function printAllBalances(
    vaultContract: Vault,
    mockTokenContract: MockToken,
    lendingProtocolContract: MockLendingProtocol,
    userAddress: string,
    logTag: string
) {

    console.log(`${logTag} User balance:                       | ${await mockTokenContract.balanceOf(userAddress)}`);
    console.log(`${logTag} User balance at vault:              | ${await vaultContract.balanceOf(userAddress)}`);
    console.log(`${logTag} Vault balance:                      | ${await mockTokenContract.balanceOf(await vaultContract.getAddress())}`);
    console.log(`${logTag} Vault balance at lending protocol:  | ${await lendingProtocolContract.balanceOf(await vaultContract.getAddress())}`);
    console.log(`${logTag} Lending protocol balance:           | ${await mockTokenContract.balanceOf(await lendingProtocolContract.getAddress())}`);
}