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
const KtySDAOPair = artifacts.require("UniswapV2Pair");

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


contract("YieldFarming", accounts => {
    const owner = accounts[0];

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

    let depositNumber;
    let ktySDAOPairAddress;

    async function advanceToNextMonth () {
        const timeUntilCurrentMonthEnd = await yieldsCalculator.timeUntilCurrentMonthEnd();
        const advancement = timeUntilCurrentMonthEnd.toNumber();
        await advanceTimeAndBlock(advancement);
    };

    before("instantiate contracts", async () => {
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

        ktySDAOPairAddress = await factory.getPair(
            kittieFightToken.address,
            superDaoToken.address
        );
        ktySDAOPair = await KtySDAOPair.at(ktySDAOPairAddress);

        // Owner takes weth.
        await weth.deposit({value: web3.utils.toWei('10000')});

        // Distribute tokens to accounts
        const airdropAmount = web3.utils.toWei('10000');

        //KTY/WETH = 50/1
        await kittieFightToken.transfer(ktyPairAddress, airdropAmount);
        await weth.transfer(ktyPairAddress, web3.utils.toWei('200'));
        await ktyWethPair.mint(owner);

        const balance = await ktyWethPair.balanceOf(owner);

        console.log(web3.utils.fromWei(balance.toString()));

        //KTY/GNO = 10/1
        await kittieFightToken.transfer(ktyGNOPairAddress, airdropAmount);
        await gno.transfer(ktyGNOPairAddress, web3.utils.toWei('1000'));
        await ktyGNOPair.mint(owner);
        const balance2 = await ktyGNOPair.balanceOf(owner);

        await kittieFightToken.transfer(ktySDAOPairAddress, web3.utils.toWei('1000000'));
        await superDaoToken.transfer(ktySDAOPairAddress, web3.utils.toWei('1000000'));
        await ktySDAOPair.mint(owner);
        const balance1 = await ktySDAOPair.balanceOf(owner);

        console.log(web3.utils.fromWei(balance1.toString()));

        const lpKtyWethAmount = web3.utils.toWei('100');
        const lpKtyGnoAmount = web3.utils.toWei('200');


        // Distribute LP tokens to accounts
        for(let i=1; i <= 5; i++) {
            await ktyWethPair.transfer(accounts[i], lpKtyWethAmount);
            await ktyGNOPair.transfer(accounts[i], lpKtyGnoAmount);
        }
    });

    it('account 1 should be able to deposit 10 kty-weth lps in day 1', async () => {
        const lpKtyWethAmount = web3.utils.toWei('10');

        await ktyWethPair.approve(yieldFarming.address, lpKtyWethAmount, {
            from: accounts[1]
        }).should.be.fulfilled;

        await yieldFarming.deposit(lpKtyWethAmount, 0, {
            from: accounts[1]
        }).should.be.fulfilled;

        let newDepositEvents = await yieldFarming.getPastEvents("Deposited", {
            fromBlock: 0,
            toBlock: "latest"
        });

        newDepositEvents.map(async (e) => {
            console.log('    DepositNumber ', e.returnValues.depositNumber);
            depositNumber = e.returnValues.depositNumber;
        })        

        const adjustedDeposits = await yieldFarming.adjustedMonthlyDeposits(0);
        console.log(adjustedDeposits.toString());
    });

    it('account 2 should be able to deposit 50 kty-gno lps in day 10', async () => {
        await advanceTimeAndBlock(48 * 60 * 10);

        const lpKtyGnoAmount = web3.utils.toWei('40');
        const amount = web3.utils.toWei('10');

        await ktyGNOPair.approve(yieldFarming.address, lpKtyGnoAmount, {
            from: accounts[2]
        }).should.be.fulfilled;

        await yieldFarming.deposit(lpKtyGnoAmount, 8, {
            from: accounts[2]
        }).should.be.fulfilled;

        await ktyGNOPair.approve(yieldFarming.address, amount, {
            from: accounts[2]
        }).should.be.fulfilled;

        await yieldFarming.deposit(amount, 8, {
            from: accounts[2]
        }).should.be.fulfilled;

        const adjustedDeposits = await yieldFarming.adjustedMonthlyDeposits(0);
        console.log(adjustedDeposits.toString());

        const APY = await yieldFarming.getAPY(ktySDAOPairAddress);

        console.log(`APY:  ${web3.utils.fromWei(APY).toString()} %`);
    });

    it("unlocks KittieFightToken and SuperDaoToken rewards for the first month", async () => {
        const KTYrewards_month_0 = await yieldsCalculator.getTotalKTYRewardsByMonth(0);
        const SDAOrewards_month_0 = await yieldsCalculator.getTotalSDAORewardsByMonth(0);

        console.log("KTY Rewards for Month 0:", weiToEther(KTYrewards_month_0));
        console.log("SDAO Rewards for Month 0:", weiToEther(SDAOrewards_month_0));

        kittieFightToken.transfer(yieldFarming.address, KTYrewards_month_0);
        superDaoToken.transfer(yieldFarming.address, SDAOrewards_month_0);
        await advanceToNextMonth();
    });

    it("unlocks KittieFightToken and SuperDaoToken rewards for the second month", async () => {
        const KTYrewards_month_1 = await yieldsCalculator.getTotalKTYRewardsByMonth(1);
        const SDAOrewards_month_1 = await yieldsCalculator.getTotalSDAORewardsByMonth(1);

        console.log("KTY Rewards for Month 1:", weiToEther(KTYrewards_month_1));
        console.log("SDAO Rewards for Month 1:", weiToEther(SDAOrewards_month_1));

        kittieFightToken.transfer(yieldFarming.address, KTYrewards_month_1);
        superDaoToken.transfer(yieldFarming.address, SDAOrewards_month_1);
        await advanceToNextMonth();
    });
});
