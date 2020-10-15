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
const SuperDaoToken = artifacts.require("MockERC20Token");
const WETH = artifacts.require("WETH9");
const Factory = artifacts.require("UniswapV2Factory");
const KtyWethPair = artifacts.require("IUniswapV2Pair");

//truffle exec scripts/FE/yieldFarming/withdrawByAmount.js user(uint) (From 1 to 18)

module.exports = async callback => {
  try {
    let yieldFarming = await YieldFarming.deployed();
    let kittieFightToken = await KittieFightToken.deployed();
    let superDaoToken = await SuperDaoToken.deployed();
    let weth = await WETH.deployed();
    let factory = await Factory.deployed();
    let ktyPairAddress = await factory.getPair(
      weth.address,
      kittieFightToken.address
    );
    let ktyWethPair = await KtyWethPair.at(ktyPairAddress);

    accounts = await web3.eth.getAccounts();

    //Changed
    let user = process.argv[4];

    let withdraw_LP_amount = new BigNumber(
      web3.utils.toWei("60", "ether") //60 Uniswap Liquidity tokens
    );
    // Info before withdraw
    console.log(`\n======== User: Batches Info Before Withdraw ======== `);
    let allBatches;
    let lastBatchNumber;
    let isBatchValid;
    let pairCode = 0;
    const pairCodeList = [
        "LP_KTY_WETH",
        "LP_KTY_ANT",
        "LP_KTY_yDAI",
        "LP_KTY_yYFI",
        "LP_KTY_yyCRV",
        "LP_KTY_yaLINK",
        "LP_KTY_LEND"
      ];

    console.log("User", user);

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
    lastBatchNumber = await yieldFarming.getLastBatchNumber(
      accounts[user],
      pairCode
    );
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarming.isBatchValid(
        accounts[user],
        j,
        pairCode
      );
      console.log("Is Batch Valid?", isBatchValid);
    }
    console.log("Last number of batches:", lastBatchNumber.toString());
    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");
    let LP_balance_user_before = await ktyWethPair.balanceOf(accounts[user]);
    let KTY_balance_user_before = await kittieFightToken.balanceOf(
      accounts[user]
    );
    let SDAO_balance_user_before = await superDaoToken.balanceOf(
      accounts[user]
    );

    // withdraw by Batch NUmber
    await yieldFarming.withdrawByAmount(withdraw_LP_amount, pairCode, {
      from: accounts[user]
    }).should.be.fulfilled;

    // Info after withdraw
    console.log(`\n======== User:  Batches Info After Withdraw ======== `);
    allBatches;
    lastBatchNumber;
    isBatchValid;

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
    lastBatchNumber = await yieldFarming.getLastBatchNumber(
      accounts[user],
      pairCode
    );
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarming.isBatchValid(
        accounts[user],
        j,
        pairCode
      );
      console.log("Is Batch Valid?", isBatchValid);
    }
    console.log("Last number of batches:", lastBatchNumber.toString());
    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");

    let LP_balance_user_after = await ktyWethPair.balanceOf(accounts[user]);
    let KTY_balance_user_after = await kittieFightToken.balanceOf(
      accounts[user]
    );
    let SDAO_balance_user_after = await superDaoToken.balanceOf(accounts[user]);
    console.log(
      "User Liquidity Token balance before withdraw:",
      weiToEther(LP_balance_user_before)
    );
    console.log(
      "User Liquidity Token balance after withdraw:",
      weiToEther(LP_balance_user_after)
    );
    console.log(
      "User KittieFightToken balance before withdraw:",
      weiToEther(KTY_balance_user_before)
    );
    console.log(
      "User KittieFightToke Token balance after withdraw:",
      weiToEther(KTY_balance_user_after)
    );
    console.log(
      "User SuperDaoToken balance before withdraw:",
      weiToEther(SDAO_balance_user_before)
    );
    console.log(
      "User SuperDaoToken balance after withdraw:",
      weiToEther(SDAO_balance_user_after)
    );

    let rewardsClaimedByUser = await yieldFarming.getTotalRewardsClaimedByStaker(
      accounts[user]
    );
    console.log(
      "Total KittieFightToken rewards claimed by user:",
      weiToEther(rewardsClaimedByUser[0])
    );
    console.log(
      "Total SuperDaoToken rewards claimed by user:",
      weiToEther(rewardsClaimedByUser[1])
    );

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

    let totalRewardsClaimed = await yieldFarming.getTotalRewardsClaimed();
    console.log(
      "Total KittieFightToken rewards claimed:",
      weiToEther(totalRewardsClaimed[0])
    );
    console.log(
      "Total SuperDaoToken rewards claimed:",
      weiToEther(totalRewardsClaimed[1])
    );

    callback();
  } catch (e) {
    callback(e);
  }
};
