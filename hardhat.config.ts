import {HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import '@openzeppelin/hardhat-upgrades';


const config: HardhatUserConfig = {
    solidity: "0.8.21",
    networks: {
        local: {
            url: "http://localhost:7545",
            chainId: 5777,
            accounts: {
                mnemonic: "dismiss prevent cruise false indicate gorilla grain tube debate immune gaze planet"
            }
        }
    }
};

export default config;
