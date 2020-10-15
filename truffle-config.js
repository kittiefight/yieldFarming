const HDWalletProvider = require("truffle-hdwallet-provider");
require("dotenv").config();

const providerFactory = network =>
  new HDWalletProvider(
    process.env.MNEMONICS || "", // Mnemonics of the deployer
    `https://${network}.infura.io/v3/${process.env.INFURA_KEY}` // Provider URL => web3.HttpProvider
  );

module.exports = {
  compilers: {
    solc: {
      version: "0.5.17",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  plugins: ["truffle-contract-size"],
  networks: {
    mainnet: {
      provider: providerFactory("mainnet"),
      network_id: 1,
      gas: 9000000,
      gasPrice: 100000000000 // 100 Gwei, Change this value according to price average of the deployment time
    },
    rinkeby: {
      provider: providerFactory("rinkeby"),
      network_id: 4,
      gas: 9000000,
      gasPrice: 50000000000 // 50 Gwei
    },
    development: {
      host: "127.0.0.1",
      port: 8544,
      network_id: "*",
      gas: 9000000
    }
  },
  mocha: {
    enableTimeouts: false,
    useColors: true,
    reporter: "eth-gas-reporter",
    reporterOptions: {
      currency: "USD",
      gasPrice: 21
    }
  }
};
