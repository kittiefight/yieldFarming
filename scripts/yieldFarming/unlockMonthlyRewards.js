const {assert} = require("chai");

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

const YieldFarming = artifacts.require("YieldFarming");
const KittieFightToken = artifacts.require("KittieFightToken");
const SuperDaoToken = artifacts.require("MockERC20Token");

//truffle exec scripts/FE/yieldFarming/unlockMonthlyRewards.js month(uint) (From 0 to 5)

module.exports = async callback => {
  try {
    let yieldFarming = await YieldFarming.deployed();
    let kittieFightToken = await KittieFightToken.deployed();
    let superDaoToken = await SuperDaoToken.deployed();

    accounts = await web3.eth.getAccounts();

    //Changed
    let month = process.argv[4];

    let currentMonth = await yieldFarming.getCurrentMonth();
    assert.equal(month, currentMonth, "wrong month");

    let timeUntilCurrentMonthEnd = await yieldFarming.timeUntilCurrentMonthEnd();
    console.log("Current Month:", currentMonth.toString());
    console.log(
      "Time (in seconds) until current month ends:",
      timeUntilCurrentMonthEnd.toString()
    );

    let advancement = timeUntilCurrentMonthEnd.toNumber();
    await advanceTimeAndBlock(advancement);

    console.log(
      "unlocks KittieFightToken and SuperDaoToken rewards for Month",
      month
    );

    let rewards_month = await yieldFarming.getTotalRewardsByMonth(month);
    let KTYrewards_month = rewards_month.rewardKTYbyMonth;
    let SDAOrewards_month = rewards_month.rewardSDAObyMonth;

    console.log("KTY Rewards for Month 0:", weiToEther(KTYrewards_month));
    console.log("SDAO Rewards for Month 0:", weiToEther(SDAOrewards_month));

    kittieFightToken.transfer(yieldFarming.address, KTYrewards_month);
    superDaoToken.transfer(yieldFarming.address, SDAOrewards_month);

    advancement = 2 * 24 * 60 * 60; // 2 days
    await advanceTimeAndBlock(advancement);

    currentMonth = await yieldFarming.getCurrentMonth();
    console.log("Current Month:", currentMonth.toString());

    callback();
  } catch (e) {
    callback(e);
  }
};
