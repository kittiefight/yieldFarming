const BigNumber = web3.utils.BN;
require("chai")
  .use(require("chai-shallow-deep-equal"))
  .use(require("chai-bignumber")(BigNumber))
  .use(require("chai-as-promised"))
  .should();

  function weiToEther(w) {
    // let eth = web3.utils.fromWei(w.toString(), "ether");
    // return Math.round(parseFloat(eth));
    return web3.utils.fromWei(w.toString(), "ether");
  }

const YieldFarming = artifacts.require("YieldFarming");
const KittieFightToken = artifacts.require("KittieFightToken");
const WETH = artifacts.require("WETH9");
const Factory = artifacts.require("UniswapV2Factory");
const KtyWethPair = artifacts.require("IUniswapV2Pair");

//truffle exec scripts/FE/yieldFarming/depositLP.js noOfUsers(uint) pairCode(uint)

module.exports = async callback => {
  try {
    let yieldFarming = await YieldFarming.deployed();
    let kittieFightToken = await KittieFightToken.deployed();
    let weth = await WETH.deployed();
    let factory = await Factory.deployed();
    let ktyPairAddress = await factory.getPair(
        weth.address,
        kittieFightToken.address
      );
    let ktyWethPair = await KtyWethPair.at(ktyPairAddress);

    accounts = await web3.eth.getAccounts();

    //Changed
    let amount = process.argv[4];
    let pairCode = process.argv[5];

    let currentMonth = await yieldFarming.getCurrentMonth();

    console.log(
      "\n====================== Current Month", currentMonth.toString(), "======================\n"
    );
    // make first deposit
    let deposit_LP_amount = new BigNumber(
      web3.utils.toWei("30", "ether") //30 Uniswap Liquidity tokens
    );

    // make 2nd deposit
    deposit_LP_amount = new BigNumber(
      web3.utils.toWei("40", "ether") //40 Uniswap Liquidity tokens
    );

    for (let i = 1; i <= amount; i++) {
      await ktyWethPair.approve(yieldFarming.address, deposit_LP_amount, {
        from: accounts[i]
      })
      await yieldFarming.deposit(deposit_LP_amount, pairCode, {
        from: accounts[i]
      })
    }

    // make 3rd deposit
    deposit_LP_amount = new BigNumber(
      web3.utils.toWei("50", "ether") //50 Uniswap Liquidity tokens
    );

    for (let i = 1; i <= amount; i++) {
      await ktyWethPair.approve(yieldFarming.address, deposit_LP_amount, {
        from: accounts[i]
      })
      await yieldFarming.deposit(deposit_LP_amount, pairCode, {
        from: accounts[i]
      })
    }

    // get info on all batches of each staker
    const pairCodeList = ["LP_KTY_WETH", "LP_KTY_ANT", "LP_KTY_yDAI", "LP_KTY_yYFI", "LP_KTY_yyCRV", "LP_KTY_yaLINK", "LP_KTY_LEND"]

    console.log(`\n======== Deposits and Batches Info ======== `);
    let allDeposits;
    let allBatches;
    let lastBatchNumber;
    for (let i = 1; i <= amount; i++) {
      console.log("User", i);
      allDeposits = await yieldFarming.getAllDeposits(accounts[i]);
      console.log("Total number of deposits:", allDeposits.length);
      console.log(
        "Pair Code Associated with Deposit Number 0:",
        allDeposits[0][0].toString()
      );
      console.log(
        "Batch Number Associated with Deposit Number 0:",
        allDeposits[0][1].toString()
      );

      allBatches = await yieldFarming.getAllBatchesPerPairPool(
        accounts[i],
        pairCode
      );
      lastBatchNumber = await yieldFarming.getLastBatchNumber(
        accounts[i],
        pairCode
      );
      for (let j = 0; j < allBatches.length; j++) {
        console.log("Pair Code:", pairCode);
        console.log("Pair Pool:", pairCodeList[pairCode]);
        console.log("Batch Number:", j);
        console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      }
      console.log("Last number of batches:", lastBatchNumber.toString());
      console.log("Total number of batches:", allBatches.length);
      console.log("****************************\n");
    }
    console.log("===============================\n");

    let total_LP_locked = await yieldFarming.getTotalLiquidityTokenLocked();
    console.log(
      "Total Uniswap Liquidity tokens locked in Yield Farming:",
      weiToEther(total_LP_locked)
    );

    let totalLiquidityTokenLockedInDAI = await yieldFarming.getTotalLiquidityTokenLockedInDAI(
      pairCode
    );
    console.log(
      "Total Uniswap Liquidity tokens locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI)
    );

    callback();
  } catch (e) {
    callback(e);
  }
};
