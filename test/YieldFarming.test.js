const BigNumber = web3.utils.BN;
require("chai")
  .use(require("chai-shallow-deep-equal"))
  .use(require("chai-bignumber")(BigNumber))
  .use(require("chai-as-promised"))
  .should();

//ARTIFACTS
const YieldFarming = artifacts.require("YieldFarming");
const SuperDaoToken = artifacts.require("MockSuperDaoToken");
const KittieFightToken = artifacts.require("KittieFightToken");
const Factory = artifacts.require("UniswapV2Factory");
const WETH = artifacts.require("WETH9");
const KtyWethPair = artifacts.require("IUniswapV2Pair");
const YieldFarmingHelper = artifacts.require("YieldFarmingHelper");
const YieldsCalculator = artifacts.require("YieldsCalculator");
const Dai = artifacts.require("Dai");
const DaiWethPair = artifacts.require("IDaiWethPair");
const GNO = artifacts.require("MockGNO");
const KtyGNOPair = artifacts.require("UniswapV2Pair");

const {assert} = require("chai");

const pairCodeList = [
  "KTY_WETH",
  "KTY_ANT",
  "KTY_YDAI",
  "KTY_YYFI",
  "KTY_YYCRV",
  "KTY_YALINK",
  "KTY_ALEND",
  "KTY_ASNX",
  "KTY_GNO",
  "KTY_2KEY",
  "KTY_YETH",
  "KTY_AYFI",
  "KTY_UNI",
  "KTY_SDAO"
];

function randomValue(num) {
  return Math.floor(Math.random() * num) + 1; // (1-num) value
}

function weiToEther(w) {
  // let eth = web3.utils.fromWei(w.toString(), "ether");
  // return Math.round(parseFloat(eth));
  return web3.utils.fromWei(w.toString(), "ether");
}

advanceTime = time => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time],
        id: new Date().getTime()
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    );
  });
};

advanceBlock = () => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_mine",
        id: new Date().getTime()
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        const newBlockHash = web3.eth.getBlock("latest").hash;

        return resolve(newBlockHash);
      }
    );
  });
};

advanceTimeAndBlock = async time => {
  await advanceTime(time);
  await advanceBlock();
  return Promise.resolve(web3.eth.getBlock("latest"));
};

//Contract instances
let yieldFarming,
  superDaoToken,
  kittieFightToken,
  factory,
  weth,
  ktyWethPair,
  yieldFarmingHelper,
  yieldsCalculator,
  dai,
  daiWethPair,
  gno,
  ktyGNOPair;

contract("YieldFarming", accounts => {
  it("instantiate contracts", async () => {
    // YieldFarming
    yieldFarming = await YieldFarming.deployed();
    // TOKENS
    superDaoToken = await SuperDaoToken.deployed();
    kittieFightToken = await KittieFightToken.deployed();
    yieldFarmingHelper = await YieldFarmingHelper.deployed();
    yieldsCalculator = await YieldsCalculator.deployed();
    weth = await WETH.deployed();
    factory = await Factory.deployed();
    dai = await Dai.deployed();
    gno = await GNO.deployed();

    const ktyPairAddress = await factory.getPair(
      weth.address,
      kittieFightToken.address
    );
    ktyWethPair = await KtyWethPair.at(ktyPairAddress);

    const daiPairAddress = await factory.getPair(weth.address, dai.address);
    daiWethPair = await DaiWethPair.at(daiPairAddress);

    const ktyGNOPairAddress = await factory.getPair(
      kittieFightToken.address,
      gno.address
    );
    ktyGNOPair = await KtyGNOPair.at(ktyGNOPairAddress);
  });

  it("sets Rewards Unlock Rate for KittieFightToken and SuperDaoToken", async () => {
    let unlockRate, KTYunlockRate, SDAOunlockRate;
    console.log(`\n======== Rewards Unlock Rate ======== `);
    for (let i = 0; i < 6; i++) {
      unlockRate = await yieldFarming.getRewardUnlockRateByMonth(i)
      KTYunlockRate = unlockRate[0]
      SDAOunlockRate = unlockRate[1]
      console.log(
        "KTY rewards unlock rate in",
        "Month",
        i,
        ":",
        KTYunlockRate.toString()
      );

      console.log(
        "SDAO rewards unlock rate in",
        "Month",
        i,
        ":",
        SDAOunlockRate.toString()
      );
    }

    console.log("===============================\n");

  });

  it("sets total KittieFightToken and SuperDaoToken rewards for the entire program duration", async () => {
    let totalRewards = await yieldFarmingHelper.getTotalRewards();
    console.log("Total KittieFightToken rewards:", weiToEther(totalRewards[0]));
    console.log("Total SuperDaoToken rewards:", weiToEther(totalRewards[1]));
  });

  it("displays associated pair pool names and addresses", async () => {
    let pair;
    console.log(`\n======== Uniswap Pair Pools ======== `);
    for (let i = 0; i < 14; i++) {
      pair = await yieldFarming.getPairPool(i);
      console.log("Pair Pool Name:", pair[0]);
      console.log("Pair Pool Adddress:", pair[1]);
      console.log("Token Address:", pair[2]);
    }

    console.log("===============================\n");

    // let pair1 = await yieldFarming.getPairPoolCode("KTY_ANT_V2");
    // assert.equal(pair1.toNumber(), 1);
  });

  it("users provides liquidity to Uniswap KTY-Weth pool", async () => {
    const weth_amount = new BigNumber(
      web3.utils.toWei("100", "ether") //100 ethers
    );

    const kty_amount = new BigNumber(
      web3.utils.toWei("50000", "ether") //100 ethers * 500 = 50,000 kty
    );

    let balanceLP;

    for (let i = 1; i < 19; i++) {
      await kittieFightToken.transfer(accounts[i], kty_amount);
      await kittieFightToken.transfer(ktyWethPair.address, kty_amount, {
        from: accounts[i]
      });
      await weth.deposit({from: accounts[i], value: weth_amount});
      await weth.transfer(ktyWethPair.address, weth_amount, {
        from: accounts[i]
      });
      await ktyWethPair.mint(accounts[i], {from: accounts[i]});

      balanceLP = await ktyWethPair.balanceOf(accounts[i]);

      console.log(
        "User",
        i,
        ": Balance of Uniswap Liquidity tokens:",
        weiToEther(balanceLP)
      );
    }

    let totalSupplyLP = await ktyWethPair.totalSupply();
    console.log(
      "Total Supply of Uniswap Liquidity tokens:",
      weiToEther(totalSupplyLP)
    );

    let ktyReserve = await yieldFarmingHelper.getReserveKTY(
      weth.address,
      ktyWethPair.address
    );
    let ethReserve = await yieldFarmingHelper.getReserveETH();
    console.log("reserveKTY:", weiToEther(ktyReserve));
    console.log("reserveETH:", weiToEther(ethReserve));

    let ether_kty_price = await yieldFarmingHelper.ETH_KTY_price();
    let kty_ether_price = await yieldFarmingHelper.KTY_ETH_price();
    console.log(
      "Ether to KTY price:",
      "1 ether to",
      weiToEther(ether_kty_price),
      "KTY"
    );
    console.log(
      "KTY to Ether price:",
      "1 KTY to",
      weiToEther(kty_ether_price),
      "ether"
    );

    // daiWethPair info
    let daiReserve = await yieldFarmingHelper.getReserveDAI();
    let ethReserveFromDai = await yieldFarmingHelper.getReserveETHfromDAI();
    console.log("reserveDAI:", weiToEther(daiReserve));
    console.log("reserveETH:", weiToEther(ethReserveFromDai));

    let ether_dai_price = await yieldFarmingHelper.ETH_DAI_price();
    let dai_ether_price = await yieldFarmingHelper.DAI_ETH_price();
    console.log(
      "Ether to DAI price:",
      "1 ether to",
      weiToEther(ether_dai_price),
      "DAI"
    );
    console.log(
      "DAI to Ether ratio:",
      "1 DAI to",
      weiToEther(dai_ether_price),
      "ether"
    );

    let kty_dai_price = await yieldFarmingHelper.KTY_DAI_price();
    let dai_kty_price = await yieldFarmingHelper.DAI_KTY_price();
    console.log(
      "KTY to DAI price:",
      "1 KTY to",
      weiToEther(kty_dai_price),
      "DAI"
    );
    console.log(
      "DAI to KTY price:",
      "1 DAI to",
      weiToEther(dai_kty_price),
      "KTY"
    );

    // check balance of pair contract
    let ktyBalance = await kittieFightToken.balanceOf(ktyWethPair.address);
    console.log(
      "KTY balance of KTY-WETH pair contract:",
      ktyBalance.toString()
    );
    let wethBalancce = await weth.balanceOf(ktyWethPair.address);
    console.log(
      "WETH balance of KTY-WETH pair contract:",
      wethBalancce.toString()
    );
  });

  it("users provides liquidity to Uniswap KTY-GNO pool", async () => {
    const gno_amount = new BigNumber(
      web3.utils.toWei("500", "ether") // 500 gno   = 100 ether
    );

    const kty_amount = new BigNumber(
      web3.utils.toWei("50000", "ether") //100 ethers * 500 = 50,000 kty
    );

    let balanceLP;

    for (let i = 1; i < 19; i++) {
      await kittieFightToken.transfer(accounts[i], kty_amount);
      await kittieFightToken.transfer(ktyGNOPair.address, kty_amount, {
        from: accounts[i]
      });
      await gno.transfer(accounts[i], gno_amount);
      await gno.transfer(ktyGNOPair.address, gno_amount, {
        from: accounts[i]
      });
      await ktyGNOPair.mint(accounts[i], {from: accounts[i]});

      balanceLP = await ktyGNOPair.balanceOf(accounts[i]);

      console.log(
        "User",
        i,
        ": Balance of Uniswap Liquidity tokens:",
        weiToEther(balanceLP)
      );
    }

    let totalSupplyLP = await ktyGNOPair.totalSupply();
    console.log(
      "Total Supply of Uniswap Liquidity tokens in KTY-GNO:",
      weiToEther(totalSupplyLP)
    );

    // check balance of pair contract
    let ktyBalance = await kittieFightToken.balanceOf(ktyGNOPair.address);
    console.log("KTY balance of KTY-GNO pair contract:", ktyBalance.toString());
    let gnoBalancce = await gno.balanceOf(ktyGNOPair.address);
    console.log(
      "WETH balance of KTY-WETH pair contract:",
      gnoBalancce.toString()
    );
  });

  // ==============================  FIRST MONTH: MONTH 0  ==============================

  it("calculates the relational factor reflecting the true intrinsic value of LP from differet pools", async () => {
    let bubbleFactor = await yieldFarmingHelper.bubbleFactor(8);
    console.log(
      "Bubble Factor in pair pool",
      pairCodeList[8],
      ":",
      bubbleFactor.toString()
    );
  });

  it("gets total early mining bonus", async () => {
    let totalEarlyMiningBonus = await yieldFarmingHelper.getTotalEarlyMiningBonus();
    console.log(
      "Early Mining Bonus KittieFightToken:",
      weiToEther(totalEarlyMiningBonus[0])
    );
    console.log(
      "Early Mining Bonus SuperDao token:",
      weiToEther(totalEarlyMiningBonus[1])
    );
  });

  it("gets program duration", async () => {
   // await advanceTimeAndBlock(1200);
    let programDuration = await yieldFarmingHelper.getProgramDuration();
    // console.log(programDuration)
    let entireProgramDuration = programDuration.entireProgramDuration;
    let monthDuration = programDuration.monthDuration;
    let startMonth = programDuration.startMonth;
    let endMonth = programDuration.endMonth;
    let currentMonth = programDuration.currentMonth;
    let daysLeft = programDuration.daysLeft;
    let elapsedMonths = programDuration.elapsedMonths;
    let monthStartTime;
    console.log(`\n======== Program Duration and Months ======== `);
    console.log("Entire program duration:", entireProgramDuration.toString());
    console.log("Month duration:", monthDuration.toString());
    console.log("Start Month:", startMonth.toString());
    console.log("End Month:", endMonth.toString());
    console.log("Current Month:", currentMonth.toString());
    console.log("Days Left:", daysLeft.toString());
    console.log("Elapsed Months:", elapsedMonths.toString());
    for (let i = 0; i < 6; i++) {
      monthStartTime = await yieldFarming.getMonthStartAt(i)
      console.log("Month", i, "Start Time:", monthStartTime.toString());
    }
    console.log("===============================================\n");
    
    let isProgramActive = await yieldFarmingHelper.isProgramActive()
    console.log("Is program active?", isProgramActive)
  });

  it("gets current month", async () => {
    let currentMonth = await yieldFarming.getCurrentMonth();
    console.log("Current Month:", currentMonth.toString());
  });

  it("estimates rewards for a user", async () => {
    let LPs = ["10", "30", "60"]
    let _LP, estimatedRewards
    let pairCode = 0
    for (let i=0; i<3; i++) {
      _LP = new BigNumber(web3.utils.toWei(LPs[i], "ether"));
      estimatedRewards = await yieldsCalculator.estimateRewards(_LP, pairCode)
      console.log("LP input:", LPs[i])
      console.log("Estimated KTY rewards:", weiToEther(estimatedRewards[0]))
      console.log("Estimated SDAO rewards:", weiToEther(estimatedRewards[1]))
    }
  })

  it("estimates rewards for a user", async () => {
    let deposit_LP_amount = new BigNumber(
      web3.utils.toWei("100", "ether") //30 Uniswap Liquidity tokens
    );
    await ktyWethPair.approve(yieldFarming.address, deposit_LP_amount, {
      from: accounts[1]
    }).should.be.fulfilled;
    await yieldFarming.deposit(deposit_LP_amount, 0, {
      from: accounts[1]
    }).should.be.fulfilled;

    let LPs = ["100", "300", "600"]
    let _LP, estimatedRewards
    let pairCode = 0
    for (let i=0; i<3; i++) {
      _LP = new BigNumber(web3.utils.toWei(LPs[i], "ether"));
      estimatedRewards = await yieldsCalculator.estimateRewards(_LP, pairCode)
      console.log("LP input:", LPs[i])
      console.log("Estimated KTY rewards:", weiToEther(estimatedRewards[0]))
      console.log("Estimated SDAO rewards:", weiToEther(estimatedRewards[1]))
    }
  })

  it("users deposit Uinswap Liquidity tokens in Yield Farming contract", async () => {
    console.log(
      "\n====================== FIRST MONTH: MONTH 0 ======================\n"
    );
    // make first deposit
    let pairCode_0 = 0;
    let pairCode_8 = 8;
    let deposit_LP_amount = new BigNumber(
      web3.utils.toWei("30", "ether") //30 Uniswap Liquidity tokens
    );
    let LP_locked;
    for (let i = 1; i < 19; i++) {
      await ktyWethPair.approve(yieldFarming.address, deposit_LP_amount, {
        from: accounts[i]
      }).should.be.fulfilled;
      await yieldFarming.deposit(deposit_LP_amount, pairCode_0, {
        from: accounts[i]
      }).should.be.fulfilled;

      await ktyGNOPair.approve(yieldFarming.address, deposit_LP_amount, {
        from: accounts[i]
      }).should.be.fulfilled;
      await yieldFarming.deposit(deposit_LP_amount, pairCode_8, {
        from: accounts[i]
      }).should.be.fulfilled;

      LP_locked = await yieldFarming.getLockedLPbyPairCode(accounts[i], pairCode_0);
      console.log(
        "Uniswap Liquidity tokens locked by user",
        i,
        ":",
        weiToEther(LP_locked)
      );
    }

    let total_LP_locked = await yieldFarmingHelper.getTotalLiquidityTokenLocked();
    console.log(
      "Total Uniswap Liquidity tokens locked in Yield Farming:",
      weiToEther(total_LP_locked)
    );

    let totalLiquidityTokenLockedInDAI_0 = await yieldFarmingHelper.getTotalLiquidityTokenLockedInDAI(
      pairCode_0
    );
    let totalLiquidityTokenLockedInDAI_8 = await yieldFarmingHelper.getTotalLiquidityTokenLockedInDAI(
      pairCode_8
    );
    console.log(
      "Total Uniswap Liquidity tokens from pair pool",
      pairCodeList[pairCode_0],
      "locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI_0)
    );
    console.log(
      "Total Uniswap Liquidity tokens from pair pool",
      pairCodeList[pairCode_8],
      "locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI_8)
    );
  });

  it("show batches of deposit of a staker", async () => {
    // make 2nd deposit
    let pairCode = 0;
    let deposit_LP_amount = new BigNumber(
      web3.utils.toWei("40", "ether") //40 Uniswap Liquidity tokens
    );

    for (let i = 1; i < 9; i++) {
      await ktyWethPair.approve(yieldFarming.address, deposit_LP_amount, {
        from: accounts[i]
      }).should.be.fulfilled;
      await yieldFarming.deposit(deposit_LP_amount, pairCode, {
        from: accounts[i]
      }).should.be.fulfilled;
    }

    // make 3rd deposit
    deposit_LP_amount = new BigNumber(
      web3.utils.toWei("50", "ether") //50 Uniswap Liquidity tokens
    );

    for (let i = 1; i < 19; i++) {
      await ktyWethPair.approve(yieldFarming.address, deposit_LP_amount, {
        from: accounts[i]
      }).should.be.fulfilled;
      await yieldFarming.deposit(deposit_LP_amount, pairCode, {
        from: accounts[i]
      }).should.be.fulfilled;
    }

    // get info on all batches of each staker
    console.log(`\n======== Deposits and Batches Info ======== `);
    let allDeposits;
    let allBatches;

    for (let i = 1; i < 19; i++) {
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
      
      for (let j = 0; j < allBatches.length; j++) {
        console.log("Pair Code:", pairCode);
        console.log("Pair Pool:", pairCodeList[pairCode]);
        console.log("Batch Number:", j);
        console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      }
  
      console.log("Total number of batches:", allBatches.length);
      console.log("****************************\n");
    }
    console.log("===============================\n");
  });

  it("unlocks KittieFightToken and SuperDaoToken rewards for the first month", async () => {
    let KTYrewards_month_0 = await yieldsCalculator.getTotalKTYRewardsByMonth(0);
    let SDAOrewards_month_0 = await yieldsCalculator.getTotalSDAORewardsByMonth(0);

    console.log("KTY Rewards for Month 0:", weiToEther(KTYrewards_month_0));
    console.log("SDAO Rewards for Month 0:", weiToEther(SDAOrewards_month_0));

    kittieFightToken.transfer(yieldFarming.address, KTYrewards_month_0);
    superDaoToken.transfer(yieldFarming.address, SDAOrewards_month_0);
  });

  it("shows locked and unloced rewards", async () => {
    let lockedRewards = await yieldFarmingHelper.getLockedRewards()
    console.log("locked KTY rewards:", weiToEther(lockedRewards[0]))
    console.log("locked SDAO rewards:", weiToEther(lockedRewards[1]))

    let unLockedRewards = await yieldFarmingHelper. getUnlockedRewards()
    console.log("unlocked KTY rewards:", weiToEther(unLockedRewards[0]))
    console.log("unlocked SDAO rewards:", weiToEther(unLockedRewards[1]))
  })

  it("user cannot withdraw if it is not on pay day", async () => {
    let payDay = await yieldFarmingHelper.isPayDay();
    console.log("Is Pay Day?", payDay[0]);

    let user = 1;
    let pairCode = 0;
    let depositNumber = 1;
    let withdraw_LP_amount = new BigNumber(
      web3.utils.toWei("20", "ether") //20 Uniswap Liquidity tokens
    );

    await yieldFarming.withdrawByDepositNumber(depositNumber, {
      from: accounts[user]
    }).should.be.rejected;

    await yieldFarming.withdrawByAmount(withdraw_LP_amount, pairCode, {
      from: accounts[user]
    }).should.be.rejected;
  });

  it("Approching the second month: Month 1", async () => {
    let currentMonth = await yieldFarming.getCurrentMonth();
    let currentDay = await yieldsCalculator.getCurrentDay();
    let daysElapsedInMonth = await yieldsCalculator.getElapsedDaysInMonth(
      currentDay,
      currentMonth
    );
    let timeUntilCurrentMonthEnd = await yieldsCalculator.timeUntilCurrentMonthEnd();
    console.log("Current Month:", currentMonth.toString());
    console.log("Current Day:", currentDay.toString());
    console.log(
      "Time (in seconds) until current month ends:",
      timeUntilCurrentMonthEnd.toString()
    );
    console.log(
      "Days elapsed in current month:",
      daysElapsedInMonth.toString()
    );
    console.log("Time is flying...");
    let advancement = timeUntilCurrentMonthEnd.toNumber();
    await advanceTimeAndBlock(advancement);
    console.log("The second Month starts: Month 1...");
  });

  // ==============================  SECOND MONTH: MONTH 1  ==============================

  it("user withdraws Uniswap Liquidity tokens by Deposit Number and get rewards in KittieFighToken and SuperDaoTokne", async () => {
    let payDay = await yieldFarmingHelper.isPayDay();
    let timeUntilPayDay = payDay[1];
    console.log("Time until Pay Day:", timeUntilPayDay.toString());

    let advancement = timeUntilPayDay.toNumber() + 3 * 60; //3 * 60 * 60;
    await advanceTimeAndBlock(advancement);

    payDay = await yieldFarmingHelper.isPayDay();
    console.log("Is Pay Day?", payDay[0]);

    // Info before withdraw
    let user = 1;
    console.log("User", user);

    let pairCode = 0;

    console.log(`\n======== User: Batches Info Before Withdraw ======== `);
    let allBatches;
    let isBatchValid;
    let isBatchEligibleForRewards;
    let lockedPeriod;
    let rewards;

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
 
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
      isBatchEligibleForRewards = await yieldsCalculator.isBatchEligibleForRewards(
        accounts[user],
        j,
        pairCode
      );
      console.log("Is Batch Eligible for Rewards?", isBatchEligibleForRewards);
      lockedPeriod = await yieldsCalculator.getLockedPeriod(
        accounts[user],
        j,
        pairCode
      );
      console.log("Starting month:", lockedPeriod[0].toString());
      console.log("Ending month:", lockedPeriod[1].toString());
      console.log("Days in Starting month:", lockedPeriod[2].toString());
      rewards = await yieldsCalculator.calculateRewardsByBatchNumber(
        accounts[user],
        j,
        pairCode
      );
      console.log("Rewards KTY:", weiToEther(rewards[0]));
      console.log("Rewards SDAO:", weiToEther(rewards[1]));
    }
  
    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");
    let LP_balance_user_1_before = await ktyWethPair.balanceOf(accounts[user]);
    let KTY_balance_user_1_before = await kittieFightToken.balanceOf(
      accounts[1]
    );
    let SDAO_balance_user_1_before = await superDaoToken.balanceOf(
      accounts[user]
    );

    let depositNumber = 0;

    // withdraw by Deposit NUmber
    await yieldFarming.withdrawByDepositNumber(depositNumber, {
      from: accounts[user]
    }).should.be.fulfilled;

    // Info after withdraw
    console.log(`\n======== User 1:  Batches Info After Withdraw ======== `);

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
  
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }

    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");

    let LP_balance_user_1_after = await ktyWethPair.balanceOf(accounts[user]);
    let KTY_balance_user_1_after = await kittieFightToken.balanceOf(
      accounts[user]
    );
    let SDAO_balance_user_1_after = await superDaoToken.balanceOf(
      accounts[user]
    );
    console.log(
      "User 1 Liquidity Token balance before withdraw:",
      weiToEther(LP_balance_user_1_before)
    );
    console.log(
      "User 1 Liquidity Token balance after withdraw:",
      weiToEther(LP_balance_user_1_after)
    );
    console.log(
      "User 1 KittieFightToken balance before withdraw:",
      weiToEther(KTY_balance_user_1_before)
    );
    console.log(
      "User 1 KittieFightToke Token balance after withdraw:",
      weiToEther(KTY_balance_user_1_after)
    );
    console.log(
      "User 1 SuperDaoToken balance before withdraw:",
      weiToEther(SDAO_balance_user_1_before)
    );
    console.log(
      "User 1 SuperDaoToken balance after withdraw:",
      weiToEther(SDAO_balance_user_1_after)
    );

    let rewardsClaimedByUser = await yieldFarming.getTotalRewardsClaimedByStaker(
      accounts[user]
    );
    console.log(
      "Total KittieFightToken rewards claimed by user 1:",
      weiToEther(rewardsClaimedByUser[0])
    );
    console.log(
      "Total SuperDaoToken rewards claimed by user 1:",
      weiToEther(rewardsClaimedByUser[1])
    );

    let total_LP_locked = await yieldFarmingHelper.getTotalLiquidityTokenLocked();
    console.log(
      "Total Uniswap Liquidity tokens locked in Yield Farming:",
      weiToEther(total_LP_locked)
    );

    let totalLiquidityTokenLockedInDAI = await yieldFarmingHelper.getTotalLiquidityTokenLockedInDAI(
      pairCode
    );
    console.log(
      "Total Uniswap Liquidity tokens locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI)
    );

    let totalRewardsClaimed = await yieldFarmingHelper.getTotalRewardsClaimed();
    console.log(
      "Total KittieFightToken rewards claimed:",
      weiToEther(totalRewardsClaimed[0])
    );
    console.log(
      "Total SuperDaoToken rewards claimed:",
      weiToEther(totalRewardsClaimed[1])
    );
  });

  it("allocates an amount of Uniswap Liquidity tokens to batches per FIFO", async () => {
    let pairCode = 0;
    let LP_amount = new BigNumber(
      web3.utils.toWei("60", "ether") //60 Uniswap Liquidity tokens
    );
    let user = 7;
    console.log("User", user);
    let allocation_LP = await yieldsCalculator.allocateLP(
      accounts[user],
      LP_amount,
      pairCode
    );
    let startBatchNumber = allocation_LP[0];
    let endBatchNumber = allocation_LP[1];
    let residual = allocation_LP[2];
    console.log("Pair pool:", pairCodeList[pairCode]);
    console.log("Starting Batch Number:", startBatchNumber.toString());
    console.log("End Batch Number:", endBatchNumber.toString());
    console.log("residual", weiToEther(residual));
  });

  it("user withdraws Uniswap Liquidity tokens by Amount and get rewards in KittieFighToken and SuperDaoTokne", async () => {
    let withdraw_LP_amount = new BigNumber(
      web3.utils.toWei("60", "ether") //60 Uniswap Liquidity tokens
    );
    // Info before withdraw
    console.log(`\n======== User: Batches Info Before Withdraw ======== `);
    let allBatches;
    let isBatchValid;
    let user = 7;
    let pairCode = 0;

    console.log("User", user);

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );

    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }

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
    isBatchValid;

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );

    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }

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

    let total_LP_locked = await yieldFarmingHelper.getTotalLiquidityTokenLocked();
    console.log(
      "Total Uniswap Liquidity tokens locked in Yield Farming:",
      weiToEther(total_LP_locked)
    );

    let totalLiquidityTokenLockedInDAI = await yieldFarmingHelper.getTotalLiquidityTokenLockedInDAI(
      pairCode
    );
    console.log(
      "Total Uniswap Liquidity tokens locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI)
    );

    let totalRewardsClaimed = await yieldFarmingHelper.getTotalRewardsClaimed();
    console.log(
      "Total KittieFightToken rewards claimed:",
      weiToEther(totalRewardsClaimed[0])
    );
    console.log(
      "Total SuperDaoToken rewards claimed:",
      weiToEther(totalRewardsClaimed[1])
    );
  });

  it("allocates an amount of Uniswap Liquidity tokens to batches per FIFO, with an empty batch among valid batches", async () => {
    let LP_amount = new BigNumber(
      web3.utils.toWei("60", "ether") //60 Uniswap Liquidity tokens
    );
    let user = 1;
    let pairCode = 0;
    console.log("User", user);
    let allocation_LP = await yieldsCalculator.allocateLP(
      accounts[user],
      LP_amount,
      pairCode
    );
    let startBatchNumber = allocation_LP[0];
    let endBatchNumber = allocation_LP[1];
    let residual = allocation_LP[2];
    console.log("Pair Pool:", pairCodeList[pairCode]);
    console.log("Starting Batch Number:", startBatchNumber.toString());
    console.log("End Batch Number:", endBatchNumber.toString());
    console.log("residual:", weiToEther(residual));
  });

  it("user withdraws Uniswap Liquidity tokens by Amount and get rewards in KittieFighToken and SuperDaoTokne, with an empty batch among valid batches", async () => {
    let withdraw_LP_amount = new BigNumber(
      web3.utils.toWei("60", "ether") //60 Uniswap Liquidity tokens
    );
    // Info before withdraw
    console.log(`\n======== User: Batches Info Before Withdraw ======== `);
    let allBatches;
    let isBatchValid;
    let user = 9;
    let pairCode = 0;

    console.log("User", user);

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
   
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }
   
    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");
    let LP_balance_user_before = await ktyWethPair.balanceOf(accounts[user]);
    let KTY_balance_user_before = await kittieFightToken.balanceOf(
      accounts[user]
    );
    let SDAO_balance_user_before = await superDaoToken.balanceOf(
      accounts[user]
    );
    let totalLPforEarlyBonus_user_before = await yieldFarmingHelper.totalLPforEarlyBonus(
      accounts[user]
    );
    totalLPforEarlyBonus_user_before = totalLPforEarlyBonus_user_before[0]
    let totalLPforEarlyBonus_user_pair_before = await yieldFarmingHelper.totalLPforEarlyBonusPerPairCode(
      accounts[user],
      pairCode
    );
    totalLPforEarlyBonus_user_pair_before = totalLPforEarlyBonus_user_pair_before[0]

    // withdraw by Amount
    await yieldFarming.withdrawByAmount(withdraw_LP_amount, pairCode, {
      from: accounts[user]
    }).should.be.fulfilled;

    // Info after withdraw
    console.log(`\n======== User:  Batches Info After Withdraw ======== `);
    allBatches;
    isBatchValid;

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
   
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }
   
    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");

    let LP_balance_user_after = await ktyWethPair.balanceOf(accounts[user]);
    let KTY_balance_user_after = await kittieFightToken.balanceOf(
      accounts[user]
    );
    let SDAO_balance_user_after = await superDaoToken.balanceOf(accounts[user]);
    let totalLPforEarlyBonus_user_after = await yieldFarmingHelper.totalLPforEarlyBonus(
      accounts[user]
    );
    totalLPforEarlyBonus_user_after = totalLPforEarlyBonus_user_after[0]
    let totalLPforEarlyBonus_user_pair_after = await yieldFarmingHelper.totalLPforEarlyBonusPerPairCode(
      accounts[user],
      pairCode
    );
    totalLPforEarlyBonus_user_pair_after = totalLPforEarlyBonus_user_pair_after[0]
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
    console.log(
      "Total LP locked for early mining bonus in pair code",
      pairCode,
      "by this user before withdraw:",
      weiToEther(totalLPforEarlyBonus_user_pair_before)
    );
    console.log(
      "Total LP locked for early mining bonus in pair code",
      pairCode,
      "by this user after withdraw:",
      weiToEther(totalLPforEarlyBonus_user_pair_after)
    );
    console.log(
      "Total LP locked for early mining bonus by this user before withdraw:",
      weiToEther(totalLPforEarlyBonus_user_before)
    );
    console.log(
      "Total LP locked for early mining bonus by this user after withdraw:",
      weiToEther(totalLPforEarlyBonus_user_after)
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

    let total_LP_locked = await yieldFarmingHelper.getTotalLiquidityTokenLocked();
    console.log(
      "Total Uniswap Liquidity tokens locked in Yield Farming:",
      weiToEther(total_LP_locked)
    );

    let totalLiquidityTokenLockedInDAI = await yieldFarmingHelper.getTotalLiquidityTokenLockedInDAI(
      pairCode
    );
    console.log(
      "Total Uniswap Liquidity tokens locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI)
    );

    let totalRewardsClaimed = await yieldFarmingHelper.getTotalRewardsClaimed();
    console.log(
      "Total KittieFightToken rewards claimed:",
      weiToEther(totalRewardsClaimed[0])
    );
    console.log(
      "Total SuperDaoToken rewards claimed:",
      weiToEther(totalRewardsClaimed[1])
    );
  });

  it("estimates rewards for a user", async () => {
    let LPs = ["10", "30", "60"]
    let _LP, estimatedRewards
    let pairCode = 0
    for (let i=0; i<3; i++) {
      _LP = new BigNumber(web3.utils.toWei(LPs[i], "ether"));
      estimatedRewards = await yieldsCalculator.estimateRewards(_LP, pairCode)
      console.log("LP input:", LPs[i])
      console.log("Estimated KTY rewards:", weiToEther(estimatedRewards[0]))
      console.log("Estimated SDAO rewards:", weiToEther(estimatedRewards[1]))
    }
  })

  it("users deposit Uinswap Liquidity tokens in Yield Farming contract", async () => {
    let advancement = 2 * 48 * 60 //2 * 24 * 60 * 60; // 2 days
    await advanceTimeAndBlock(advancement);

    let deposit_LP_amount = new BigNumber(
      web3.utils.toWei("10", "ether") //30 Uniswap Liquidity tokens
    );
    let LP_locked;
    let pairCode = 0;
    for (let i = 1; i < 19; i++) {
      await ktyWethPair.approve(yieldFarming.address, deposit_LP_amount, {
        from: accounts[i]
      }).should.be.fulfilled;
      await yieldFarming.deposit(deposit_LP_amount, pairCode, {
        from: accounts[i]
      }).should.be.fulfilled;
      LP_locked = await yieldFarming.getLockedLPbyPairCode(accounts[i], pairCode);
      console.log(
        "Uniswap Liquidity tokens locked by user",
        i,
        ":",
        weiToEther(LP_locked)
      );
    }

    let total_LP_locked = await yieldFarmingHelper.getTotalLiquidityTokenLocked();
    console.log(
      "Total Uniswap Liquidity tokens locked in Yield Farming:",
      weiToEther(total_LP_locked)
    );

    let totalLiquidityTokenLockedInDAI = await yieldFarmingHelper.getTotalLiquidityTokenLockedInDAI(
      pairCode
    );
    console.log(
      "Total Uniswap Liquidity tokens locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI)
    );

    // get info on all batches of each staker
    console.log(`\n======== Deposits and Batches Info ======== `);
    let allDeposits;
    let lastDepositNumber;
    let allBatches;

    for (let i = 1; i < 19; i++) {
      console.log("User", i);
      allDeposits = await yieldFarming.getAllDeposits(accounts[i]);
      lastDepositNumber = allDeposits.length - 1;
      console.log("Total number of deposits:", allDeposits.length);
      console.log(
        "Pair Code Associated with Deposit Number",
        lastDepositNumber,
        ":",
        allDeposits[lastDepositNumber][0].toString()
      );
      console.log(
        "Batch Number Associated with Deposit Number",
        lastDepositNumber,
        ":",
        allDeposits[lastDepositNumber][1].toString()
      );
      allBatches = await yieldFarming.getAllBatchesPerPairPool(
        accounts[i],
        pairCode
      );
      
      for (let j = 0; j < allBatches.length; j++) {
        console.log("Pair Pool:", pairCodeList[pairCode]);
        console.log("Batch Number:", j);
        console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      }
     
      console.log("Total number of batches:", allBatches.length);
      console.log("****************************\n");
    }
    console.log("===============================\n");
  });

  it("gets a user's wallet balance", async () => {
    let balance;
    for (let i = 1; i < 19; i++) {
      balance = await yieldFarmingHelper.getWalletBalance(accounts[i], 0)
      console.log("User", i, "balance in pair pool", pairCodeList[0], "is:", weiToEther(balance))
    }
  })

  it("user cannot withdraw if it is not on pay day", async () => {
    let payDay = await yieldFarmingHelper.isPayDay();
    console.log("Is Pay Day?", payDay[0]);

    let user = 3;
    let pairCode = 0;
    let depositNumber = 1;
    let withdraw_LP_amount = new BigNumber(
      web3.utils.toWei("20", "ether") //20 Uniswap Liquidity tokens
    );

    await yieldFarming.withdrawByDepositNumber(depositNumber, {
      from: accounts[user]
    }).should.be.rejected;

    await yieldFarming.withdrawByAmount(withdraw_LP_amount, pairCode, {
      from: accounts[user]
    }).should.be.rejected;
  });

  it("calculates APY, reward multiplier, and accrued rewards for a user", async () => {
    let totalLPs = await yieldsCalculator.getTotalLPsLocked(accounts[17]);
    console.log("Total LPs locked:", weiToEther(totalLPs));
    let APY = await yieldsCalculator.getAPY(accounts[17])
    let rewardMultiplier = await yieldsCalculator.getRewardMultipliers(accounts[18])
    let accruedRewards = await yieldsCalculator.getAccruedRewards(accounts[17])
    console.log("APY:", APY.toString())
    console.log("KTY Reward Multiplier:", rewardMultiplier[0].toString())
    console.log("KTY Reward Multiplier:", rewardMultiplier[1].toString())
    console.log("Accrued KTY Rewards:", weiToEther(accruedRewards[0]))
    console.log("Accrued SDAO Rewards:", weiToEther(accruedRewards[1]))
  })


  it("Approching the third month: Month 2", async () => {
    let timeUntilCurrentMonthEnd = await yieldsCalculator.timeUntilCurrentMonthEnd();
    let advancement = timeUntilCurrentMonthEnd.toNumber();
    await advanceTimeAndBlock(advancement);
    console.log("The third Month starts: Month 2...");
  });

  it("unlocks KittieFightToken and SuperDaoToken rewards for the second month (Month 1", async () => {
    let pastMonth = 1;
    //let rewards_month = await yieldFarming.getTotalRewardsByMonth(
    // currentMonth
    //);
    let KTYrewards_month = await yieldsCalculator.getTotalKTYRewardsByMonth(
      pastMonth
    );
    let SDAOrewards_month = await yieldsCalculator.getTotalSDAORewardsByMonth(
      pastMonth
    );

    console.log(
      "KTY Rewards for Month ",
      pastMonth,
      ":",
      weiToEther(KTYrewards_month)
    );
    console.log(
      "SDAO Rewards for Month ",
      pastMonth,
      ":",
      weiToEther(SDAOrewards_month)
    );

    kittieFightToken.transfer(yieldFarming.address, KTYrewards_month);
    superDaoToken.transfer(yieldFarming.address, SDAOrewards_month);
  });

  it("user withdraws Uniswap Liquidity tokens by Deposit Number and get rewards in KittieFighToken and SuperDaoTokne", async () => {
    let payDay = await yieldFarmingHelper.isPayDay();
    let timeUntilPayDay = payDay[1];
    console.log("Time until Pay Day:", timeUntilPayDay.toString());
    if (timeUntilPayDay.toNumber() > 0) {
      let advancement = timeUntilPayDay.toNumber() + 10;
      await advanceTimeAndBlock(advancement);
    }
    payDay = await yieldFarmingHelper.isPayDay();
    console.log("Is Pay Day?", payDay[0]);
    // Info before withdraw
    let user = 3;
    console.log("User", user);
    let pairCode = 0;

    console.log(`\n======== User: Batches Info Before Withdraw ======== `);
    let allBatches;
    let isBatchValid;

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
   
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }
    
    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");
    let LP_balance_user_1_before = await ktyWethPair.balanceOf(accounts[user]);
    let KTY_balance_user_1_before = await kittieFightToken.balanceOf(
      accounts[1]
    );
    let SDAO_balance_user_1_before = await superDaoToken.balanceOf(
      accounts[user]
    );

    let rewards = await yieldsCalculator.calculateRewardsByDepositNumber(
      accounts[user],
      1
    );
    console.log("KittieFightToken rewards:", weiToEther(rewards[0]));
    console.log("SuperDaoToken rewards:", weiToEther(rewards[1]));

    // withdraw by Batch NUmber
    await yieldFarming.withdrawByDepositNumber(0, {from: accounts[user]}).should
      .be.fulfilled;

    // Info after withdraw
    console.log(`\n======== User:  Batches Info After Withdraw ======== `);
    allBatches;
    isBatchValid;

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
   
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }
   
    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");

    let LP_balance_user_1_after = await ktyWethPair.balanceOf(accounts[user]);
    let KTY_balance_user_1_after = await kittieFightToken.balanceOf(
      accounts[user]
    );
    let SDAO_balance_user_1_after = await superDaoToken.balanceOf(
      accounts[user]
    );
    console.log(
      "User Liquidity Token balance before withdraw:",
      weiToEther(LP_balance_user_1_before)
    );
    console.log(
      "User Liquidity Token balance after withdraw:",
      weiToEther(LP_balance_user_1_after)
    );
    console.log(
      "User KittieFightToken balance before withdraw:",
      weiToEther(KTY_balance_user_1_before)
    );
    console.log(
      "User KittieFightToke Token balance after withdraw:",
      weiToEther(KTY_balance_user_1_after)
    );
    console.log(
      "User SuperDaoToken balance before withdraw:",
      weiToEther(SDAO_balance_user_1_before)
    );
    console.log(
      "User SuperDaoToken balance after withdraw:",
      weiToEther(SDAO_balance_user_1_after)
    );

    let rewardsClaimedByUser = await yieldFarming.getTotalRewardsClaimedByStaker(
      accounts[user]
    );
    console.log(
      "Total KittieFightToken rewards claimed by user 1:",
      weiToEther(rewardsClaimedByUser[0])
    );
    console.log(
      "Total SuperDaoToken rewards claimed by user 1:",
      weiToEther(rewardsClaimedByUser[1])
    );

    let total_LP_locked = await yieldFarmingHelper.getTotalLiquidityTokenLocked();
    console.log(
      "Total Uniswap Liquidity tokens locked in Yield Farming:",
      weiToEther(total_LP_locked)
    );

    let totalLiquidityTokenLockedInDAI = await yieldFarmingHelper.getTotalLiquidityTokenLockedInDAI(
      pairCode
    );
    console.log(
      "Total Uniswap Liquidity tokens locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI)
    );

    let totalRewardsClaimed = await yieldFarmingHelper.getTotalRewardsClaimed();
    console.log(
      "Total KittieFightToken rewards claimed:",
      weiToEther(totalRewardsClaimed[0])
    );
    console.log(
      "Total SuperDaoToken rewards claimed:",
      weiToEther(totalRewardsClaimed[1])
    );
  });

  it("allocates an amount of Uniswap Liquidity tokens to batches per FIFO", async () => {
    let LP_amount = new BigNumber(
      web3.utils.toWei("60", "ether") //60 Uniswap Liquidity tokens
    );
    let user = 6;
    let pairCode = 0;
    console.log("User", user);
    let allocation_LP = await yieldsCalculator.allocateLP(
      accounts[user],
      LP_amount,
      pairCode
    );
    let startBatchNumber = allocation_LP[0];
    let endBatchNumber = allocation_LP[1];
    let residual = allocation_LP[2];
    console.log("Pair Pool:", pairCodeList[pairCode]);
    console.log("Starting Batch Number:", startBatchNumber.toString());
    console.log("End Batch Number:", endBatchNumber.toString());
    console.log("residual:", weiToEther(residual));
  });

  it("user withdraws Uniswap Liquidity tokens by Amount and get rewards in KittieFighToken and SuperDaoTokne", async () => {
    let withdraw_LP_amount = new BigNumber(
      web3.utils.toWei("60", "ether") //60 Uniswap Liquidity tokens
    );
    // Info before withdraw
    console.log(`\n======== User: Batches Info Before Withdraw ======== `);
    let allBatches;
    let isBatchValid;
    let user = 6;
    let pairCode = 0;

    console.log("User", user);

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
    
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }

    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");
    let LP_balance_user_before = await ktyWethPair.balanceOf(accounts[user]);
    let KTY_balance_user_before = await kittieFightToken.balanceOf(
      accounts[user]
    );
    let SDAO_balance_user_before = await superDaoToken.balanceOf(
      accounts[user]
    );

    // withdraw by Amount
    await yieldFarming.withdrawByAmount(withdraw_LP_amount, pairCode, {
      from: accounts[user]
    }).should.be.fulfilled;

    // Info after withdraw
    console.log(`\n======== User:  Batches Info After Withdraw ======== `);
    allBatches;
    isBatchValid;

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
  
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }

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

    let total_LP_locked = await yieldFarmingHelper.getTotalLiquidityTokenLocked();
    console.log(
      "Total Uniswap Liquidity tokens locked in Yield Farming:",
      weiToEther(total_LP_locked)
    );

    let totalLiquidityTokenLockedInDAI = await yieldFarmingHelper.getTotalLiquidityTokenLockedInDAI(
      pairCode
    );
    console.log(
      "Total Uniswap Liquidity tokens locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI)
    );

    let totalRewardsClaimed = await yieldFarmingHelper.getTotalRewardsClaimed();
    console.log(
      "Total KittieFightToken rewards claimed:",
      weiToEther(totalRewardsClaimed[0])
    );
    console.log(
      "Total SuperDaoToken rewards claimed:",
      weiToEther(totalRewardsClaimed[1])
    );
  });

  it("allocates an amount of Uniswap Liquidity tokens to batches per FIFO, with an empty batch among valid batches", async () => {
    let LP_amount = new BigNumber(
      web3.utils.toWei("60", "ether") //60 Uniswap Liquidity tokens
    );
    let user = 3;
    let pairCode = 0;
    console.log("User", user);
    let allocation_LP = await yieldsCalculator.allocateLP(
      accounts[user],
      LP_amount,
      pairCode
    );
    let startBatchNumber = allocation_LP[0];
    let endBatchNumber = allocation_LP[1];
    let residual = allocation_LP[2];
    console.log("Pair Pool:", pairCodeList[pairCode]);
    console.log("Starting Batch Number:", startBatchNumber.toString());
    console.log("End Batch Number:", endBatchNumber.toString());
    console.log("residual:", weiToEther(residual));
  });

  it("user withdraws Uniswap Liquidity tokens by Amount and get rewards in KittieFighToken and SuperDaoTokne, with an empty batch among valid batches", async () => {
    let withdraw_LP_amount = new BigNumber(
      web3.utils.toWei("60", "ether") //60 Uniswap Liquidity tokens
    );
    // Info before withdraw
    console.log(`\n======== User: Batches Info Before Withdraw ======== `);
    let allBatches;
    let isBatchValid;
    let user = 3;
    let pairCode = 0;

    console.log("User", user);

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
  
    for (let j = 0; j < allBatches.length; j++) {
      console.log("pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }
   
    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");
    let LP_balance_user_before = await ktyWethPair.balanceOf(accounts[user]);
    let KTY_balance_user_before = await kittieFightToken.balanceOf(
      accounts[user]
    );
    let SDAO_balance_user_before = await superDaoToken.balanceOf(
      accounts[user]
    );

    // withdraw by Amount
    await yieldFarming.withdrawByAmount(withdraw_LP_amount, pairCode, {
      from: accounts[user]
    }).should.be.fulfilled;

    // Info after withdraw
    console.log(`\n======== User:  Batches Info After Withdraw ======== `);
    allBatches;
   
    isBatchValid;

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
  
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }
  
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

    let total_LP_locked = await yieldFarmingHelper.getTotalLiquidityTokenLocked();
    console.log(
      "Total Uniswap Liquidity tokens locked in Yield Farming:",
      weiToEther(total_LP_locked)
    );

    let totalLiquidityTokenLockedInDAI = await yieldFarmingHelper.getTotalLiquidityTokenLockedInDAI(
      pairCode
    );
    console.log(
      "Total Uniswap Liquidity tokens locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI)
    );

    let totalRewardsClaimed = await yieldFarmingHelper.getTotalRewardsClaimed();
    console.log(
      "Total KittieFightToken rewards claimed:",
      weiToEther(totalRewardsClaimed[0])
    );
    console.log(
      "Total SuperDaoToken rewards claimed:",
      weiToEther(totalRewardsClaimed[1])
    );
  });

  it("Approching the fourth month: Month 3", async () => {
    let timeUntilCurrentMonthEnd = await yieldsCalculator.timeUntilCurrentMonthEnd();

    let advancement = timeUntilCurrentMonthEnd.toNumber() + 3 * 60//2 * 24 * 60 * 60;
    await advanceTimeAndBlock(advancement);
    console.log("The Fourth Month starts: Month 3...");
  });

  it("unlocks KittieFightToken and SuperDaoToken rewards for the third month (Month 2)", async () => {
    let pastMonth = 2;
    //let rewards_month = await yieldFarming.getTotalRewardsByMonth(
    //  currentMonth
    //);
    let KTYrewards_month = await yieldsCalculator.getTotalKTYRewardsByMonth(
      pastMonth
    );
    let SDAOrewards_month = await yieldsCalculator.getTotalSDAORewardsByMonth(
      pastMonth
    );

    console.log(
      "KTY Rewards for Month ",
      pastMonth,
      ":",
      weiToEther(KTYrewards_month)
    );
    console.log(
      "SDAO Rewards for Month ",
      pastMonth,
      ":",
      weiToEther(SDAOrewards_month)
    );

    kittieFightToken.transfer(yieldFarming.address, KTYrewards_month);
    superDaoToken.transfer(yieldFarming.address, SDAOrewards_month);
  });

  it("Approching the fifth month: Month 4", async () => {
    let currentMonth = await yieldFarming.getCurrentMonth();
    let currentDay = await yieldsCalculator.getCurrentDay();
    let daysElapsedInMonth = await yieldsCalculator.getElapsedDaysInMonth(
      currentDay,
      currentMonth
    );
    let timeUntilCurrentMonthEnd = await yieldsCalculator.timeUntilCurrentMonthEnd();
    console.log("Current Month:", currentMonth.toString());
    console.log("Current Day:", currentDay.toString());
    console.log(
      "Time (in seconds) until current month ends:",
      timeUntilCurrentMonthEnd.toString()
    );
    console.log(
      "Days elapsed in current month:",
      daysElapsedInMonth.toString()
    );
    console.log("Time is flying...");

    let advancement = timeUntilCurrentMonthEnd.toNumber();
    await advanceTimeAndBlock(advancement);
    console.log("The fifth Month starts: Month 4...");
  });

  it("unlocks KittieFightToken and SuperDaoToken rewards for the fourth month (Month 3", async () => {
    let pastMonth = 3;
    //let rewards_month = await yieldFarming.getTotalRewardsByMonth(pastMonth);
    let KTYrewards_month = await yieldsCalculator.getTotalKTYRewardsByMonth(
      pastMonth
    );
    let SDAOrewards_month = await yieldsCalculator.getTotalSDAORewardsByMonth(
      pastMonth
    );

    console.log(
      "KTY Rewards for Month ",
      pastMonth,
      ":",
      weiToEther(KTYrewards_month)
    );
    console.log(
      "SDAO Rewards for Month ",
      pastMonth,
      ":",
      weiToEther(SDAOrewards_month)
    );

    kittieFightToken.transfer(yieldFarming.address, KTYrewards_month);
    superDaoToken.transfer(yieldFarming.address, SDAOrewards_month);
  });

  // ==============================  FIFTH MONTH: MONTH 4  ==============================
  it("users deposit Uinswap Liquidity tokens in Yield Farming contract", async () => {
    let advancement = 3 * 60//2 * 24 * 60 * 60; // 2 days
    await advanceTimeAndBlock(advancement);

    console.log(
      "\n====================== FIFTH MONTH: MONTH 4 ======================\n"
    );
    let deposit_LP_amount = new BigNumber(
      web3.utils.toWei("30", "ether") //30 Uniswap Liquidity tokens
    );
    let LP_locked;
    let pairCode = 8;
    for (let i = 1; i < 6; i++) {
      await ktyGNOPair.approve(yieldFarming.address, deposit_LP_amount, {
        from: accounts[i]
      }).should.be.fulfilled;
      await yieldFarming.deposit(deposit_LP_amount, pairCode, {
        from: accounts[i]
      }).should.be.fulfilled;
      LP_locked = await yieldFarming.getLockedLPbyPairCode(accounts[i], pairCode);
      console.log(
        "Uniswap Liquidity tokens locked by user",
        i,
        ":",
        weiToEther(LP_locked)
      );
    }

    let total_LP_locked = await yieldFarmingHelper.getTotalLiquidityTokenLocked();
    console.log(
      "Total Uniswap Liquidity tokens locked in Yield Farming:",
      weiToEther(total_LP_locked)
    );

    let totalLiquidityTokenLockedInDAI = await yieldFarmingHelper.getTotalLiquidityTokenLockedInDAI(
      pairCode
    );
    console.log(
      "Total Uniswap Liquidity tokens locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI)
    );

    // get info on all batches of each staker
    console.log(`\n======== Deposits and Batches Info ======== `);
    let allDeposits;
    let lastDepositNumber;
    let allBatches;

    for (let i = 1; i < 19; i++) {
      console.log("User", i);
      allDeposits = await yieldFarming.getAllDeposits(accounts[i]);
      lastDepositNumber = allDeposits.length - 1;
      console.log("Total number of deposits:", allDeposits.length);
      console.log(
        "Pair Code Associated with Deposit Number",
        lastDepositNumber,
        ":",
        allDeposits[lastDepositNumber][0].toString()
      );
      console.log(
        "Batch Number Associated with Deposit Number",
        lastDepositNumber,
        ":",
        allDeposits[lastDepositNumber][1].toString()
      );
      allBatches = await yieldFarming.getAllBatchesPerPairPool(
        accounts[i],
        pairCode
      );
    
      for (let j = 0; j < allBatches.length; j++) {
        console.log("Pair Pool:", pairCodeList[pairCode]);
        console.log("Batch Number:", j);
        console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      }
 
      console.log("Total number of batches:", allBatches.length);
      console.log("****************************\n");
    }
    console.log("===============================\n");
  });

  it("Approching the sixth month: Month 5", async () => {
    let currentMonth = await yieldFarming.getCurrentMonth();
    let currentDay = await yieldsCalculator.getCurrentDay();
    let daysElapsedInMonth = await yieldsCalculator.getElapsedDaysInMonth(
      currentDay,
      currentMonth
    );
    let timeUntilCurrentMonthEnd = await yieldsCalculator.timeUntilCurrentMonthEnd();
    console.log("Current Month:", currentMonth.toString());
    console.log("Current Day:", currentDay.toString());
    console.log(
      "Time (in seconds) until current month ends:",
      timeUntilCurrentMonthEnd.toString()
    );
    console.log(
      "Days elapsed in current month:",
      daysElapsedInMonth.toString()
    );
    console.log("Time is flying...");

    let advancement = timeUntilCurrentMonthEnd.toNumber();
    await advanceTimeAndBlock(advancement);
    console.log("The sixth Month starts: Month 5...");
  });

  it("unlocks KittieFightToken and SuperDaoToken rewards for the fifth month (Month 4", async () => {
    let pastMonth = 4;
    //let rewards_month = await yieldFarming.getTotalRewardsByMonth(pastMonth);
    let KTYrewards_month = await yieldsCalculator.getTotalKTYRewardsByMonth(
      pastMonth
    );
    let SDAOrewards_month = await yieldsCalculator.getTotalSDAORewardsByMonth(
      pastMonth
    );

    console.log(
      "KTY Rewards for Month ",
      pastMonth,
      ":",
      weiToEther(KTYrewards_month)
    );
    console.log(
      "SDAO Rewards for Month ",
      pastMonth,
      ":",
      weiToEther(SDAOrewards_month)
    );

    kittieFightToken.transfer(yieldFarming.address, KTYrewards_month);
    superDaoToken.transfer(yieldFarming.address, SDAOrewards_month);
  });

  // ==============================  SIXTH MONTH: MONTH 5  ==============================
  it("users deposit in the sixth month", async () => {
    let deposit_LP_amount = new BigNumber(
      web3.utils.toWei("70", "ether") //30 Uniswap Liquidity tokens
    );
    let pairCode = 8;
    for (let i = 17; i < 19; i++) {
      await ktyGNOPair.approve(yieldFarming.address, deposit_LP_amount, {
        from: accounts[i]
      }).should.be.fulfilled;
      await yieldFarming.deposit(deposit_LP_amount, pairCode, {
        from: accounts[i]
      }).should.be.fulfilled;
    }
  });

  it("user withdraws Uniswap Liquidity tokens by Amount and get rewards", async () => {
    let payDay = await yieldFarmingHelper.isPayDay();
    let timeUntilPayDay = payDay[1];
    console.log("Time until Pay Day:", timeUntilPayDay.toString());
    if (timeUntilPayDay.toNumber() > 0) {
      let advancement = timeUntilPayDay.toNumber() + 10;
      await advanceTimeAndBlock(advancement);
    }
    payDay = await yieldFarmingHelper.isPayDay();
    console.log("Is Pay Day?", payDay[0]);

    let withdraw_LP_amount = new BigNumber(
      web3.utils.toWei("5", "ether") //60 Uniswap Liquidity tokens
    );
    // Info before withdraw
    console.log(`\n======== User: Batches Info Before Withdraw ======== `);
    let allBatches;
    let isBatchValid;
    let user = 3;
    let pairCode = 8;

    console.log("User", user);

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
   
    for (let j = 0; j < allBatches.length; j++) {
      console.log("pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }
  
    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");
    let LP_balance_user_before = await ktyGNOPair.balanceOf(accounts[user]);
    let KTY_balance_user_before = await kittieFightToken.balanceOf(
      accounts[user]
    );
    let SDAO_balance_user_before = await superDaoToken.balanceOf(
      accounts[user]
    );

    // withdraw by Amount
    await yieldFarming.withdrawByAmount(withdraw_LP_amount, pairCode, {
      from: accounts[user]
    }).should.be.fulfilled;

    // Info after withdraw
    console.log(`\n======== User:  Batches Info After Withdraw ======== `);
    allBatches;
    isBatchValid;

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
   
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }
  
    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");

    let LP_balance_user_after = await ktyGNOPair.balanceOf(accounts[user]);
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

    let total_LP_locked = await yieldFarmingHelper.getTotalLiquidityTokenLocked();
    console.log(
      "Total Uniswap Liquidity tokens locked in Yield Farming:",
      weiToEther(total_LP_locked)
    );

    let totalLiquidityTokenLockedInDAI = await yieldFarmingHelper.getTotalLiquidityTokenLockedInDAI(
      pairCode
    );
    console.log(
      "Total Uniswap Liquidity tokens locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI)
    );

    let totalRewardsClaimed = await yieldFarmingHelper.getTotalRewardsClaimed();
    console.log(
      "Total KittieFightToken rewards claimed:",
      weiToEther(totalRewardsClaimed[0])
    );
    console.log(
      "Total SuperDaoToken rewards claimed:",
      weiToEther(totalRewardsClaimed[1])
    );
  });

  it("user withdraws again Uniswap Liquidity tokens by Amount and get rewards", async () => {
    let withdraw_LP_amount = new BigNumber(
      web3.utils.toWei("50", "ether") //60 Uniswap Liquidity tokens
    );
    // Info before withdraw
    console.log(`\n======== User: Batches Info Before Withdraw ======== `);
    let allBatches;
    let isBatchValid;
    let user = 10;
    let pairCode = 0;

    console.log("User", user);

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
 
    for (let j = 0; j < allBatches.length; j++) {
      console.log("pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }
   
    console.log("Total number of batches:", allBatches.length);
    console.log("===============================\n");
    let LP_balance_user_before = await ktyWethPair.balanceOf(accounts[user]);
    let KTY_balance_user_before = await kittieFightToken.balanceOf(
      accounts[user]
    );
    let SDAO_balance_user_before = await superDaoToken.balanceOf(
      accounts[user]
    );

    // withdraw by Amount
    await yieldFarming.withdrawByAmount(withdraw_LP_amount, pairCode, {
      from: accounts[user]
    }).should.be.fulfilled;

    // Info after withdraw
    console.log(`\n======== User:  Batches Info After Withdraw ======== `);
    allBatches;
    isBatchValid;

    allBatches = await yieldFarming.getAllBatchesPerPairPool(
      accounts[user],
      pairCode
    );
 
    for (let j = 0; j < allBatches.length; j++) {
      console.log("Pair Pool:", pairCodeList[pairCode]);
      console.log("Batch Number:", j);
      console.log("Liquidity Locked:", weiToEther(allBatches[j]));
      isBatchValid = await yieldFarmingHelper.isBatchValid(
        accounts[user],
        pairCode,
        j
      );
      console.log("Is Batch Valid?", isBatchValid);
    }
  
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

    let total_LP_locked = await yieldFarmingHelper.getTotalLiquidityTokenLocked();
    console.log(
      "Total Uniswap Liquidity tokens locked in Yield Farming:",
      weiToEther(total_LP_locked)
    );

    let totalLiquidityTokenLockedInDAI = await yieldFarmingHelper.getTotalLiquidityTokenLockedInDAI(
      pairCode
    );
    console.log(
      "Total Uniswap Liquidity tokens locked in Dai value:",
      weiToEther(totalLiquidityTokenLockedInDAI)
    );

    let totalRewardsClaimed = await yieldFarmingHelper.getTotalRewardsClaimed();
    console.log(
      "Total KittieFightToken rewards claimed:",
      weiToEther(totalRewardsClaimed[0])
    );
    console.log(
      "Total SuperDaoToken rewards claimed:",
      weiToEther(totalRewardsClaimed[1])
    );
  });

  it("Approching the end of sixth month: Month 5", async () => {
    let currentMonth = await yieldFarming.getCurrentMonth();
    let currentDay = await yieldsCalculator.getCurrentDay();
    console.log("Current Month:", currentMonth.toString());
    console.log("Current Day:", currentDay.toString());
    let daysElapsedInMonth = await yieldsCalculator.getElapsedDaysInMonth(
      currentDay,
      currentMonth
    );
    console.log(
      "Days elapsed in current month:",
      daysElapsedInMonth.toString()
    );
    let timeUntilCurrentMonthEnd = await yieldsCalculator.timeUntilCurrentMonthEnd();
    console.log(
      "Time (in seconds) until current month ends:",
      timeUntilCurrentMonthEnd.toString()
    );

    console.log("Time is flying...");

    let advancement = timeUntilCurrentMonthEnd.toNumber();
    await advanceTimeAndBlock(advancement);
    console.log("The sixth Month ends");
  });

  it("unlocks KittieFightToken and SuperDaoToken rewards for the sixth month and the early bonus", async () => {
    let pastMonth = 5;
    //let rewards_month = await yieldFarming.getTotalRewardsByMonth(pastMonth);
    let KTYrewards_month = await yieldsCalculator.getTotalKTYRewardsByMonth(
      pastMonth
    );
    let SDAOrewards_month = await yieldsCalculator.getTotalSDAORewardsByMonth(
      pastMonth
    );

    console.log(
      "KTY Rewards for Month ",
      pastMonth,
      ":",
      weiToEther(KTYrewards_month)
    );
    console.log(
      "SDAO Rewards for Month ",
      pastMonth,
      ":",
      weiToEther(SDAOrewards_month)
    );

    let earlyBonus = await yieldFarming.EARLY_MINING_BONUS.call();
    console.log("Early Bonus:", weiToEther(earlyBonus));

    let kty_amount = new BigNumber(
      web3.utils.toWei(
        (
          Number(weiToEther(KTYrewards_month)) + Number(weiToEther(earlyBonus))
        ).toString(),
        "ether"
      )
    );

    let sdao_amount = new BigNumber(
      web3.utils.toWei(
        (
          Number(weiToEther(SDAOrewards_month)) + Number(weiToEther(earlyBonus))
        ).toString(),
        "ether"
      )
    );

    kittieFightToken.transfer(yieldFarming.address, kty_amount);
    superDaoToken.transfer(yieldFarming.address, sdao_amount);
  });

  // ==============================  Yield Farming Program Ends  ==============================

  it("users can withdraw early bonus after program ends", async () => {
    let advancement = 24 * 60 * 60;
    await advanceTimeAndBlock(advancement);

    let totalDeposits, eligible, lockedLP, bonusForDeposit, newWithdraw;

    for (let i = 1; i < 16; i++) {
      totalDeposits = await yieldFarming.getAllDeposits(accounts[i]);
      console.log(
        `\n======== User`,
        i,
        `: deposits eligible for early bonus ======== `
      );
      for (let j = 0; j < totalDeposits.length; j++) {
        eligible = await yieldFarmingHelper.isDepositEligibleForEarlyBonus(
          accounts[i],
          j
        );
        if (eligible == true) {
          console.log("Deposit", j);
          lockedLP = await yieldFarmingHelper.getLockedLPinDeposit(accounts[i], j);
          lockedLP = lockedLP[0]
          locke_liquidity_tokens = new BigNumber(
            web3.utils.toWei(weiToEther(lockedLP), "ether")
          );
          bonusForDeposit = await yieldsCalculator.getEarlyBonus(
            locke_liquidity_tokens
          );
          console.log(
            "Early Bonus for Deposit",
            j,
            ":",
            weiToEther(bonusForDeposit)
          );

          await yieldFarming.withdrawByDepositNumber(j, {from: accounts[i]});
          newWithdraw = await yieldFarming.getPastEvents("WithDrawn", {
            fromBlock: "latest",
            toBlock: "latest"
          });
          newWithdraw.map(async e => {
            console.log("\n**** NEW WITHDRAW HAPPENED ****");
            console.log(
              "    KTY reward ",
              weiToEther(e.returnValues.KTYamount)
            );
            console.log(
              "    SuperDao reward ",
              weiToEther(e.returnValues.SDAOamount)
            );
            console.log("************************\n");
          });
        }
      }
    }
    console.log("===============================\n");
  });

  it("user withdraws by partial amount after program ends", async () => {
    let payDay = await yieldFarmingHelper.isPayDay();
    console.log("Is Pay Day?", payDay[0]);
    let user = 16;
    let pairCode0 = 0;
    let pairCode8 = 8;
    let allLP_0 = await yieldFarming.getLockedLPbyPairCode(
      accounts[user],
      pairCode0
    );
    let allLP_8 = await yieldFarming.getLockedLPbyPairCode(
      accounts[user],
      pairCode8
    );
    console.log(
      "all liquidity tokens locked by user",
      user,
      "per",
      pairCodeList[pairCode0],
      ":",
      weiToEther(allLP_0)
    );
    console.log(
      "all liquidity tokens locked by user",
      user,
      "per",
      pairCodeList[pairCode8],
      ":",
      weiToEther(allLP_8)
    );
    let withdraw_LP_amount_0 = new BigNumber(
      web3.utils.toWei((Number(weiToEther(allLP_0)) - 5).toString(), "ether")
    );
    let withdraw_LP_amount_8 = new BigNumber(
      web3.utils.toWei((Number(weiToEther(allLP_8)) - 5).toString(), "ether")
    );

    await yieldFarming.withdrawByAmount(withdraw_LP_amount_0, pairCode0, {
      from: accounts[user]
    });

    newWithdraw = await yieldFarming.getPastEvents("WithDrawn", {
      fromBlock: "latest",
      toBlock: "latest"
    });

    newWithdraw.map(async e => {
      console.log("\n**** NEW WITHDRAW HAPPENED ****");
      console.log("    Liquidity tokens ", weiToEther(e.returnValues.LPamount));
      console.log("    KTY reward ", weiToEther(e.returnValues.KTYamount));
      console.log(
        "    SuperDao reward ",
        weiToEther(e.returnValues.SDAOamount)
      );
      console.log("************************\n");
    });

    await yieldFarming.withdrawByAmount(withdraw_LP_amount_8, pairCode8, {
      from: accounts[user]
    });

    newWithdraw = await yieldFarming.getPastEvents("WithDrawn", {
      fromBlock: "latest",
      toBlock: "latest"
    });

    newWithdraw.map(async e => {
      console.log("\n**** NEW WITHDRAW HAPPENED ****");
      console.log("    Liquidity tokens ", weiToEther(e.returnValues.LPamount));
      console.log("    KTY reward ", weiToEther(e.returnValues.KTYamount));
      console.log(
        "    SuperDao reward ",
        weiToEther(e.returnValues.SDAOamount)
      );
      console.log("************************\n");
    });
  });

  it("user withdraws by amount after program ends", async () => {
    let user = 17;
    let pairCode0 = 0;
    let pairCode8 = 8;
    let allLP_0 = await yieldFarming.getLockedLPbyPairCode(
      accounts[user],
      pairCode0
    );
    let allLP_8 = await yieldFarming.getLockedLPbyPairCode(
      accounts[user],
      pairCode8
    );
    console.log(
      "all liquidity tokens locked by user",
      user,
      "per",
      pairCodeList[pairCode0],
      ":",
      weiToEther(allLP_0)
    );
    console.log(
      "all liquidity tokens locked by user",
      user,
      "per",
      pairCodeList[pairCode8],
      ":",
      weiToEther(allLP_8)
    );
    let withdraw_LP_amount_0 = new BigNumber(
      web3.utils.toWei(weiToEther(allLP_0), "ether")
    );
    let withdraw_LP_amount_8 = new BigNumber(
      web3.utils.toWei(weiToEther(allLP_8), "ether")
    );

    await yieldFarming.withdrawByAmount(withdraw_LP_amount_0, pairCode0, {
      from: accounts[user]
    });

    newWithdraw = await yieldFarming.getPastEvents("WithDrawn", {
      fromBlock: "latest",
      toBlock: "latest"
    });

    newWithdraw.map(async e => {
      console.log("\n**** NEW WITHDRAW HAPPENED ****");
      console.log("    Liquidity tokens ", weiToEther(e.returnValues.LPamount));
      console.log("    KTY reward ", weiToEther(e.returnValues.KTYamount));
      console.log(
        "    SuperDao reward ",
        weiToEther(e.returnValues.SDAOamount)
      );
      console.log("************************\n");
    });

    await yieldFarming.withdrawByAmount(withdraw_LP_amount_8, pairCode8, {
      from: accounts[user]
    });

    newWithdraw = await yieldFarming.getPastEvents("WithDrawn", {
      fromBlock: "latest",
      toBlock: "latest"
    });

    newWithdraw.map(async e => {
      console.log("\n**** NEW WITHDRAW HAPPENED ****");
      console.log("    Liquidity tokens ", weiToEther(e.returnValues.LPamount));
      console.log("    KTY reward ", weiToEther(e.returnValues.KTYamount));
      console.log(
        "    SuperDao reward ",
        weiToEther(e.returnValues.SDAOamount)
      );
      console.log("************************\n");
    });
  });

  it("user withdraws again by amount after program ends", async () => {
    let advancement = 30 * 24 * 60 * 60;
    await advanceTimeAndBlock(advancement);
    console.log("Time is flying...");
    // user 18 withdraws all her locked LPs,
    // and now all the deposits now meet the 30-criteria for claming rewards
    let user = 18;
    let pairCode0 = 0;
    let pairCode8 = 8;
    let allLP_0 = await yieldFarming.getLockedLPbyPairCode(
      accounts[user],
      pairCode0
    );
    let allLP_8 = await yieldFarming.getLockedLPbyPairCode(
      accounts[user],
      pairCode8
    );
    console.log(
      "all liquidity tokens locked by user",
      user,
      "per",
      pairCodeList[pairCode0],
      ":",
      weiToEther(allLP_0)
    );
    console.log(
      "all liquidity tokens locked by user",
      user,
      "per",
      pairCodeList[pairCode8],
      ":",
      weiToEther(allLP_8)
    );
    let withdraw_LP_amount_0 = new BigNumber(
      web3.utils.toWei(weiToEther(allLP_0), "ether")
    );
    let withdraw_LP_amount_8 = new BigNumber(
      web3.utils.toWei(weiToEther(allLP_8), "ether")
    );
    await yieldFarming.withdrawByAmount(withdraw_LP_amount_0, pairCode0, {
      from: accounts[user]
    });

    newWithdraw = await yieldFarming.getPastEvents("WithDrawn", {
      fromBlock: "latest",
      toBlock: "latest"
    });

    newWithdraw.map(async e => {
      console.log("\n**** NEW WITHDRAW HAPPENED ****");
      console.log("    Liquidity tokens ", weiToEther(e.returnValues.LPamount));
      console.log("    KTY reward ", weiToEther(e.returnValues.KTYamount));
      console.log(
        "    SuperDao reward ",
        weiToEther(e.returnValues.SDAOamount)
      );
      console.log("************************\n");
    });

    await yieldFarming.withdrawByAmount(withdraw_LP_amount_8, pairCode8, {
      from: accounts[user]
    });

    newWithdraw = await yieldFarming.getPastEvents("WithDrawn", {
      fromBlock: "latest",
      toBlock: "latest"
    });

    newWithdraw.map(async e => {
      console.log("\n**** NEW WITHDRAW HAPPENED ****");
      console.log("    Liquidity tokens ", weiToEther(e.returnValues.LPamount));
      console.log("    KTY reward ", weiToEther(e.returnValues.KTYamount));
      console.log(
        "    SuperDao reward ",
        weiToEther(e.returnValues.SDAOamount)
      );
      console.log("************************\n");
    });

    // compare the total rewards claimed by user 17 and user 18
    let rewards_claimed_17 = await yieldFarming.getTotalRewardsClaimedByStaker(
      accounts[17]
    );
    let rewards_claimed_18 = await yieldFarming.getTotalRewardsClaimedByStaker(
      accounts[18]
    );
    let KTY_claimed_17 = rewards_claimed_17[0];
    let SDAO_claimed_17 = rewards_claimed_17[1];
    let KTY_claimed_18 = rewards_claimed_18[0];
    let SDAO_claimed_18 = rewards_claimed_18[1];

    console.log("\n**** Total Rewards Claimed by User 17 ****");
    console.log("KTY rewards:", weiToEther(KTY_claimed_17));
    console.log("SuperDao rewards:", weiToEther(SDAO_claimed_17));
    console.log("************************\n");

    console.log("\n**** Total Rewards Claimed by User 18 ****");
    console.log("KTY rewards:", weiToEther(KTY_claimed_18));
    console.log("SuperDao rewards:", weiToEther(SDAO_claimed_18));
    console.log("************************\n");

  });

  it("transfers leftover rewards to a new address", async () => {
    let advancement = 90 * 24 * 60 * 60;
    await advanceTimeAndBlock(advancement);

    let KTY_bal = await kittieFightToken.balanceOf(yieldFarming.address);
    let SDAO_bal = await superDaoToken.balanceOf(yieldFarming.address);
    console.log(
      "Final KTY balance in YieldFarming contract:",
      weiToEther(KTY_bal)
    );
    console.log(
      "Final SDAO balance in YieldFarming contract:",
      weiToEther(SDAO_bal)
    );

    if (Number(weiToEther(KTY_bal)) > 0) {
      let KTY_leftover = new BigNumber(
        web3.utils.toWei(weiToEther(KTY_bal), "ether")
      );
      await yieldFarming.returnTokens(kittieFightToken.address, KTY_leftover, accounts[0]).should.be.fulfilled;
    }

    if (Number(weiToEther(SDAO_bal)) > 0) {
      let SDAO_leftover = new BigNumber(
        web3.utils.toWei(weiToEther(SDAO_bal), "ether")
      );
      await yieldFarming.returnTokens(superDaoToken.address, SDAO_leftover, accounts[0]).should.be.fulfilled;
    }

    
  });
});
