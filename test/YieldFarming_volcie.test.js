const BigNumber = web3.utils.BN;
require("chai")
  .use(require("chai-shallow-deep-equal"))
  .use(require("chai-bignumber")(BigNumber))
  .use(require("chai-as-promised"))
  .should();

//ARTIFACTS
const Volcie = artifacts.require("VolcieToken");
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
const KtySDAOPair = artifacts.require("UniswapV2Pair");

const DAY = 48 * 60;

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
let volcie,
  yieldFarming,
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
  ktyGNOPair,
  ktySDAOPair;

contract("YieldFarming", accounts => {
  it("instantiate contracts", async () => {
    // YieldFarming
    volcie = await Volcie.deployed();
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

    const ktySdaoPairAddress = await factory.getPair(
      superDaoToken.address,
      kittieFightToken.address
    );
    ktySDAOPair = await KtySDAOPair.at(ktySdaoPairAddress);

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
      unlockRate = await yieldFarming.getRewardUnlockRateByMonth(i);
      KTYunlockRate = unlockRate[0];
      SDAOunlockRate = unlockRate[1];
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

    let reserve = await yieldFarmingHelper.getReserve(
      kittieFightToken.address,
      weth.address,
      ktyWethPair.address
    );
    console.log("reserveKTY:", weiToEther(reserve[0]));
    console.log("reserveETH:", weiToEther(reserve[1]));

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
    let reserves = await yieldFarmingHelper.getReserve(
      dai.address,
      weth.address,
      daiWethPair.address
    );
    console.log("reserveDAI:", weiToEther(reserves[0]));
    console.log("reserveETH:", weiToEther(reserves[1]));

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
      "GNO balance of KTY-GNO pair contract:",
      gnoBalancce.toString()
    );
  });

  it("users provides liquidity to Uniswap KTY-SDAO pool", async () => {
    const sdao_amount = new BigNumber(
      web3.utils.toWei("25000", "ether") // 
    );

    const kty_amount = new BigNumber(
      web3.utils.toWei("50000", "ether") //
    );

    let balanceLP;

    for (let i = 1; i < 19; i++) {
      await kittieFightToken.transfer(accounts[i], kty_amount);
      await kittieFightToken.transfer(ktySDAOPair.address, kty_amount, {
        from: accounts[i]
      });
      await superDaoToken.transfer(accounts[i], sdao_amount);
      await superDaoToken.transfer(ktySDAOPair.address, sdao_amount, {
        from: accounts[i]
      });
      await ktySDAOPair.mint(accounts[i], {from: accounts[i]});

      balanceLP = await ktySDAOPair.balanceOf(accounts[i]);

      console.log(
        "User",
        i,
        ": Balance of Uniswap Liquidity tokens:",
        weiToEther(balanceLP)
      );
    }

    let totalSupplyLP = await ktySDAOPair.totalSupply();
    console.log(
      "Total Supply of Uniswap Liquidity tokens in KTY-SDAO:",
      weiToEther(totalSupplyLP)
    );

    // check balance of pair contract
    let ktyBalance = await kittieFightToken.balanceOf(ktySDAOPair.address);
    console.log("KTY balance of KTY-SDAO pair contract:", ktyBalance.toString());
    let sdaoBalancce = await superDaoToken.balanceOf(ktySDAOPair.address);
    console.log(
      "SDAO balance of KTY-SDAO pair contract:",
      sdaoBalancce.toString()
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
      monthStartTime = await yieldFarming.getMonthStartAt(i);
      console.log("Month", i, "Start Time:", monthStartTime.toString());
    }
    console.log("===============================================\n");

    let isProgramActive = await yieldFarmingHelper.isProgramActive();
    console.log("Is program active?", isProgramActive);
  });

  it("estimates rewards for any hypothetical amount of LPs to be diposited", async () => {
    let LP_amount = new BigNumber(
      web3.utils.toWei("30", "ether") //30 Uniswap Liquidity tokens
    );
    let currentMonth = await yieldFarming.getCurrentMonth();
    currentMonth = currentMonth.toNumber()
    console.log("Current Month:", currentMonth);
    let currentDay = await yieldsCalculator.getCurrentDay();
    currentDay = currentDay.toNumber()
    console.log("Current Day:", currentDay);
    let monthlyProportion = await yieldsCalculator.getElapsedDaysInMonth(currentDay, currentMonth);
    console.log("Monthly Proportion:", monthlyProportion.toString())
    let firstMonthAmount = await yieldsCalculator.getFirstMonthAmount(
      currentDay, currentMonth, LP_amount, LP_amount);
    console.log("firstMonthAmount:", weiToEther(firstMonthAmount))

    let estimatedEarlyBonus = await yieldsCalculator.estimateEarlyBonus(LP_amount, 0);
    console.log("estimated early bonus:", weiToEther(estimatedEarlyBonus))
  
    let estimatedRewards = await yieldsCalculator.estimateRewards(LP_amount, 0);
    console.log("estimated KTY rewards:", weiToEther(estimatedRewards[0]))
    console.log("estimated SDAO rewards:", weiToEther(estimatedRewards[1]))
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

      LP_locked = await yieldFarming.getLockedLPbyPairCode(
        accounts[i],
        pairCode_0
      );
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

    let newDepositEvents = await yieldFarming.getPastEvents("Deposited", {
      fromBlock: 0,
      toBlock: "latest"
    });

    newDepositEvents.map(async e => {
      console.log("\n==== NEW volcie minted ===");
      console.log("    funder ", e.returnValues.sender);
      console.log("    VOLCIE Token ID ", e.returnValues.volcieTokenID);
      console.log("    Deposit Number ", e.returnValues.depositNumber);
      console.log("    Pair Code ", e.returnValues.pairCode);
      console.log("    Locked LP ", e.returnValues.lockedLP);
      console.log("    Deposit Time ", e.returnValues.depositTime);
      console.log("========================\n");
    });
  });

  it("show batches of deposit of a staker", async () => {
    await advanceTimeAndBlock(DAY * 3);
    // make 2nd deposit
    let pairCode = 0;
    let deposit_LP_amount = new BigNumber(
      web3.utils.toWei("40", "ether") //40 Uniswap Liquidity tokens
    );

    for (let i = 1; i < 19; i++) {
      await ktyWethPair.approve(yieldFarming.address, deposit_LP_amount, {
        from: accounts[i]
      }).should.be.fulfilled;
      await yieldFarming.deposit(deposit_LP_amount, pairCode, {
        from: accounts[i]
      }).should.be.fulfilled;
    }

    // make 3rd deposit
    await advanceTimeAndBlock(DAY * 5);
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

    let newDepositEvents = await yieldFarming.getPastEvents("Deposited", {
      fromBlock: 0,
      toBlock: "latest"
    });

    newDepositEvents.map(async e => {
      console.log("\n==== NEW volcie minted ===");
      console.log("    funder ", e.returnValues.sender);
      console.log("    VOLCIE Token ID ", e.returnValues.volcieTokenID);
      console.log("    Deposit Number ", e.returnValues.depositNumber);
      console.log("    Pair Code ", e.returnValues.pairCode);
      console.log("    Locked LP ", e.returnValues.lockedLP);
      console.log("    Deposit Time ", e.returnValues.depositTime);
      console.log("========================\n");
    });
  });

  it("unlocks KittieFightToken and SuperDaoToken rewards for the first month", async () => {
    let KTYrewards_month_0 = await yieldsCalculator.getTotalKTYRewardsByMonth(
      0
    );
    let SDAOrewards_month_0 = await yieldsCalculator.getTotalSDAORewardsByMonth(
      0
    );

    console.log("KTY Rewards for Month 0:", weiToEther(KTYrewards_month_0));
    console.log("SDAO Rewards for Month 0:", weiToEther(SDAOrewards_month_0));

    kittieFightToken.transfer(yieldFarming.address, KTYrewards_month_0);
    superDaoToken.transfer(yieldFarming.address, SDAOrewards_month_0);
  });

  it("shows locked and unloced rewards", async () => {
    let lockedRewards = await yieldFarmingHelper.getLockedRewards();
    console.log("locked KTY rewards:", weiToEther(lockedRewards[0]));
    console.log("locked SDAO rewards:", weiToEther(lockedRewards[1]));

    let unLockedRewards = await yieldFarmingHelper.getUnlockedRewards();
    console.log("unlocked KTY rewards:", weiToEther(unLockedRewards[0]));
    console.log("unlocked SDAO rewards:", weiToEther(unLockedRewards[1]));
  });

  it("user cannot withdraw if it is not on pay day", async () => {
    let payDay = await yieldFarmingHelper.isPayDay();
    console.log("Is Pay Day?", payDay[0]);

    let user = 1;
    let pairCode = 0;
    let voicieID = 1;
    let withdraw_LP_amount = new BigNumber(
      web3.utils.toWei("20", "ether") //20 Uniswap Liquidity tokens
    );

    await yieldFarming.withdrawByVolcieID(voicieID, {
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

  it("calculates APY, reward multiplier, and accrued rewards for a user", async () => {
    let totalLPs = await yieldsCalculator.getTotalLPsLocked(accounts[17]);
    console.log("Total LPs locked:", weiToEther(totalLPs));
    let APY = await yieldFarming.getAPY(ktySDAOPair.address);
    let expectedPrice_KTY_SDAO = await yieldFarming.getExpectedPrice_KTY_SDAO(ktySDAOPair.address)
    let rewardMultiplier = await yieldsCalculator.getRewardMultipliers(
      accounts[18]
    );
    let accruedRewards = await yieldsCalculator.getAccruedRewards(accounts[17]);
    console.log("APY:", weiToEther(APY));
    console.log("expectedPrice_KTY_SDAO", weiToEther(expectedPrice_KTY_SDAO));
    console.log("KTY Reward Multiplier:", rewardMultiplier[0].toString());
    console.log("KTY Reward Multiplier:", rewardMultiplier[1].toString());
    console.log("Accrued KTY Rewards:", weiToEther(accruedRewards[0]));
    console.log("Accrued SDAO Rewards:", weiToEther(accruedRewards[1]));
  });

  it("estimates rewards for any hypothetical amount of LPs to be diposited", async () => {
    let LP_amount = new BigNumber(
      web3.utils.toWei("30", "ether") //30 Uniswap Liquidity tokens
    );
    let currentMonth = await yieldFarming.getCurrentMonth();
    currentMonth = currentMonth.toNumber()
    console.log("Current Month:", currentMonth);
    let currentDay = await yieldsCalculator.getCurrentDay();
    currentDay = currentDay.toNumber()
    console.log("Current Day:", currentDay);
    let monthlyProportion = await yieldsCalculator.getElapsedDaysInMonth(currentDay, currentMonth);
    console.log("Monthly Proportion:", monthlyProportion.toString())
    let firstMonthAmount = await yieldsCalculator.getFirstMonthAmount(
      currentDay, currentMonth, LP_amount, LP_amount);
    console.log("firstMonthAmount:", weiToEther(firstMonthAmount))

    let estimatedEarlyBonus = await yieldsCalculator.estimateEarlyBonus(LP_amount, 0);
    console.log("estimated early bonus:", weiToEther(estimatedEarlyBonus))
  
    let estimatedRewards = await yieldsCalculator.estimateRewards(LP_amount, 0);
    console.log("estimated KTY rewards:", weiToEther(estimatedRewards[0]))
    console.log("estimated SDAO rewards:", weiToEther(estimatedRewards[1]))
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

  it("Approching the fourth month: Month 3", async () => {
    let timeUntilCurrentMonthEnd = await yieldsCalculator.timeUntilCurrentMonthEnd();

    let advancement = timeUntilCurrentMonthEnd.toNumber() + 3 * 60; //2 * 24 * 60 * 60;
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
    let advancement = 3 * 60; //2 * 24 * 60 * 60; // 2 days
    await advanceTimeAndBlock(advancement);

    console.log(
      "\n====================== FIFTH MONTH: MONTH 4 ======================\n"
    );
    let deposit_LP_amount = new BigNumber(
      web3.utils.toWei("30", "ether") //30 Uniswap Liquidity tokens
    );
    let LP_locked;
    let pairCode = 8;
    for (let i = 1; i < 19; i++) {
      await ktyGNOPair.approve(yieldFarming.address, deposit_LP_amount, {
        from: accounts[i]
      }).should.be.fulfilled;
      await yieldFarming.deposit(deposit_LP_amount, pairCode, {
        from: accounts[i]
      }).should.be.fulfilled;
      LP_locked = await yieldFarming.getLockedLPbyPairCode(
        accounts[i],
        pairCode
      );
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

    let newDepositEvents = await yieldFarming.getPastEvents("Deposited", {
      fromBlock: 0,
      toBlock: "latest"
    });

    newDepositEvents.map(async e => {
      console.log("\n==== NEW volcie minted ===");
      console.log("    funder ", e.returnValues.sender);
      console.log("    VOLCIE Token ID ", e.returnValues.volcieTokenID);
      console.log("    Deposit Number ", e.returnValues.depositNumber);
      console.log("    Pair Code ", e.returnValues.pairCode);
      console.log("    Locked LP ", e.returnValues.lockedLP);
      console.log("    Deposit Time ", e.returnValues.depositTime);
      console.log("========================\n");
    });
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
      web3.utils.toWei("30", "ether") //30 Uniswap Liquidity tokens
    );
    let pairCode = 8;
    for (let i = 1; i < 19; i++) {
      await ktyGNOPair.approve(yieldFarming.address, deposit_LP_amount, {
        from: accounts[i]
      }).should.be.fulfilled;
      await yieldFarming.deposit(deposit_LP_amount, pairCode, {
        from: accounts[i]
      }).should.be.fulfilled;
    }

    let newDepositEvents = await yieldFarming.getPastEvents("Deposited", {
      fromBlock: 0,
      toBlock: "latest"
    });

    newDepositEvents.map(async e => {
      console.log("\n==== NEW volcie minted ===");
      console.log("    funder ", e.returnValues.sender);
      console.log("    VOLCIE Token ID ", e.returnValues.volcieTokenID);
      console.log("    Deposit Number ", e.returnValues.depositNumber);
      console.log("    Pair Code ", e.returnValues.pairCode);
      console.log("    Locked LP ", e.returnValues.lockedLP);
      console.log("    Deposit Time ", e.returnValues.depositTime);
      console.log("========================\n");
    });
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

  it("users withdraw LP and burn volcies", async () => {
    let advancement = DAY * 2;
    await advanceTimeAndBlock(advancement);
    let user, volcieIDs, volcieID, claimedRewards;
    for (let i = 1; i < 18; i++) {
      user = i;
      console.log("user", i);
      volcieIDs = await volcie.allTokenOf(accounts[i]);
      //console.log(volcieIDs)
      for (let j = 0; j < volcieIDs.length; j++) {
        volcieID = volcieIDs[j].toNumber();

        await yieldFarming.withdrawByVolcieID(volcieID, {
          from: accounts[i]
        }).should.be.fulfilled;
      }

      claimedRewards = await yieldFarming.getTotalRewardsClaimedByStaker(
        accounts[i]
      );
      console.log("Total KTY reward claimed:", weiToEther(claimedRewards[0]));
      console.log("Total SDAO reward claimed:", weiToEther(claimedRewards[1]));
    }

    let newDepositEvents = await yieldFarming.getPastEvents(
      "VolcieTokenBurnt",
      {
        fromBlock: 0,
        toBlock: "latest"
      }
    );

    newDepositEvents.map(async e => {
      console.log("\n==== Volcie Burnt ===");
      console.log("    Burner ", e.returnValues.burner);
      console.log("    Original Owner ", e.returnValues.originalOwner);
      console.log("    VOLCIE Token ID ", e.returnValues.volcieTokenID);
      console.log("    Deposit Number ", e.returnValues.depositNumber);
      console.log("    Pair Code ", e.returnValues.pairCode);
      console.log("    KTY rewards ", e.returnValues.KTYamount);
      console.log("    SDAO rewards ", e.returnValues.SDAOamount);
      console.log("    Locked LP ", e.returnValues.LPamount);
      console.log("    Deposit Time ", e.returnValues.withdrawTime);
      console.log("========================\n");
    });
  });

  it("a user sells volcie tokens to another user", async () => {
    let volcieIDs, volcieID;
    let seller = 18;
    let buyer = 20;
    volcieIDs = await volcie.allTokenOf(accounts[seller]);
    for (let i = 0; i < volcieIDs.length; i++) {
      volcieID = volcieIDs[i].toNumber();
      await volcie.approve(accounts[buyer], volcieID, {from: accounts[seller]})
        .should.be.fulfilled;
      await volcie.transferFrom(accounts[seller], accounts[buyer], volcieID, {
        from: accounts[seller]
      }).should.be.fulfilled;

      await yieldFarming.withdrawByVolcieID(volcieID, {
        from: accounts[seller]
      }).should.be.rejected;
    }
  });

  it("shows accrued rewards for a staker", async () => {
    let user = 20;
    console.log("user", user);
    let accruedRewards = await yieldsCalculator.getAccruedRewards(
      accounts[user]
    );
    console.log("accured KTY rewards:", weiToEther(accruedRewards[0]));
    console.log("accured SDAO rewards:", weiToEther(accruedRewards[1]));
  });

  it("a user can burn volcie tokens bought from other users, and get rewards", async () => {
    let volcieIDs,
      volcieID,
      estimatedValues,
      earlyBonus,
      isEligibleForEarlyBonus;
    let buyer = 20;
    volcieIDs = await volcie.allTokenOf(accounts[buyer]);
    for (let i = 0; i < volcieIDs.length; i++) {
      volcieID = volcieIDs[i].toNumber();
      console.log("volcie ID:", volcieID);
      isEligibleForEarlyBonus = await yieldsCalculator.isVolcieEligibleForEarlyBonus(
        volcieID
      );
      console.log(
        "Is Volcie eligible for early bonus:",
        isEligibleForEarlyBonus
      );
      console.log("\n==== Before Burning ===");
      earlyBonus = await yieldsCalculator.getEarlyBonusForVolcie(volcieID);
      console.log("estimated early bonus:", weiToEther(earlyBonus));
      estimatedValues = await yieldsCalculator.getVolcieValues(volcieID);
      console.log("LP values:", weiToEther(estimatedValues[0]));
      console.log("LP values in DAI:", weiToEther(estimatedValues[1]));
      console.log("estimated KTY values:", weiToEther(estimatedValues[2]));
      console.log("estimated SDAO values:", weiToEther(estimatedValues[3]));
      console.log("========================\n");

      await yieldFarming.withdrawByVolcieID(volcieID, {
        from: accounts[buyer]
      }).should.be.fulfilled;
    }

    let newDepositEvents = await yieldFarming.getPastEvents(
      "VolcieTokenBurnt",
      {
        fromBlock: "latest",
        toBlock: "latest"
      }
    );

    newDepositEvents.map(async e => {
      console.log("\n==== Volcie Burnt ===");
      console.log("    Burner ", e.returnValues.burner);
      console.log("    Original Owner ", e.returnValues.originalOwner);
      console.log("    VOLCIE Token ID ", e.returnValues.volcieTokenID);
      console.log("    Deposit Number ", e.returnValues.depositNumber);
      console.log("    Pair Code ", e.returnValues.pairCode);
      console.log("    KTY rewards ", e.returnValues.KTYamount);
      console.log("    SDAO rewards ", e.returnValues.SDAOamount);
      console.log("    Locked LP ", e.returnValues.LPamount);
      console.log("    Withdrawal Time ", e.returnValues.withdrawTime);
      console.log("========================\n");
    });
  });

  it("shows accrued rewards for a staker", async () => {
    let user = 20;
    console.log("user", user);
    let accruedRewards = await yieldsCalculator.getAccruedRewards(
      accounts[user]
    );
    console.log("accured KTY rewards:", weiToEther(accruedRewards[0]));
    console.log("accured SDAO rewards:", weiToEther(accruedRewards[1]));

    let volcieIDs = await volcie.allTokenOf(accounts[user]);
    for (let i=0; i< volcieIDs.length; i++) {
        console.log("volcie ID:",volcieIDs[i].toNumber())
    }
  });

  it("shows total deposited LP", async () => {
    let totalDeposit = await yieldFarmingHelper.getTotalDeposits()
    console.log("Total Deposited LPs:", weiToEther(totalDeposit))
    let totalDepositsInDai = await yieldFarmingHelper.getTotalDepositsInDai()
    console.log("Total Deposited LPs in Dai value:", weiToEther(totalDepositsInDai))
  })

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
  });
});
