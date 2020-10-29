// all percentage use a base of 1000,000 in kittieFight system
// for example, 0.3 % is set as 3,000
// and 90% is set as 900,000
const BigNumber = web3.utils.BN;

//ARTIFACTS
const Volcie = artifacts.require("VolcieToken.sol");
const YieldFarming = artifacts.require("YieldFarming");
const SuperDaoToken = artifacts.require("MockSuperDaoToken");
const KittieFightToken = artifacts.require("KittieFightToken");
const Factory = artifacts.require("UniswapV2Factory");
const WETH = artifacts.require("WETH9");
const KtyWethPair = artifacts.require("UniswapV2Pair");
const YieldFarmingHelper = artifacts.require("YieldFarmingHelper");
const YieldsCalculator = artifacts.require("YieldsCalculator");
const Dai = artifacts.require("Dai");
const DaiWethPair = artifacts.require("UniswapV2Pair");
const ANT = artifacts.require("MockANT");
const YDAI = artifacts.require("MockyDAI");
const YYFI = artifacts.require("MockyYFI");
const YYCRV = artifacts.require("MockyyCRV");
const YALINK = artifacts.require("MockyaLINK");
const ALEND = artifacts.require("MockaLEND");
const ASNX = artifacts.require("MockaSNX");
const GNO = artifacts.require("MockGNO");
const _2KEY = artifacts.require("Mock2key");
const YETH = artifacts.require("MockyETH");
const AYFI = artifacts.require("MockaYFI");
const UNI = artifacts.require("MockUNI");
const KtyAntPair = artifacts.require("UniswapV2Pair");
const KtyYDAIPair = artifacts.require("UniswapV2Pair");
const KtyYYFIPair = artifacts.require("UniswapV2Pair");
const KtyYYCRVPair = artifacts.require("UniswapV2Pair");
const KtyYALINKPair = artifacts.require("UniswapV2Pair");
const KtyALENDPair = artifacts.require("UniswapV2Pair");
const KtyASNXPair = artifacts.require("UniswapV2Pair");
const KtyGNOPair = artifacts.require("UniswapV2Pair");
const Kty2keyPair = artifacts.require("UniswapV2Pair");
const KtyYETHPair = artifacts.require("UniswapV2Pair");
const KtyAYFIPair = artifacts.require("UniswapV2Pair");
const KtyUNIPair = artifacts.require("UniswapV2Pair");
const KtySDAOPair = artifacts.require("UniswapV2Pair");


//Rinkeby address of KittieFightToken
//const KTY_ADDRESS = '0x8d05f69bd9e804eb467c7e1f2902ecd5e41a72da';

const ERC20_TOKEN_SUPPLY = new BigNumber(
  web3.utils.toWei("100000000", "ether") //100 Million
);

const TOTAL_KTY_REWARDS = new BigNumber(
  web3.utils.toWei("7000000", "ether") //7,000,000 KTY
);

const TOTAL_SDAO_REWARDS = new BigNumber(
  web3.utils.toWei("7000000", "ether") //7,000,000 SDAO
);

// const TOKENS_SOLD = new BigNumber(
//   web3.utils.toWei("1000000", "ether") //1,000,000 SDAO
// );

const TOKENS_SOLD = new BigNumber(
  web3.utils.toWei("10000", "ether") //1,000,000 SDAO
);

module.exports = (deployer, network, accounts) => {
  deployer
    .deploy(YieldFarming)
    .then(() => deployer.deploy(Volcie))
    .then(() => deployer.deploy(SuperDaoToken))
    .then(() => deployer.deploy(KittieFightToken))
    .then(() => deployer.deploy(WETH))
    .then(() => deployer.deploy(Factory, accounts[0]))
    .then(() => deployer.deploy(YieldFarmingHelper))
    .then(() => deployer.deploy(YieldsCalculator))
    .then(() => deployer.deploy(Dai))
    .then(() => deployer.deploy(ANT))
    .then(() => deployer.deploy(YDAI))
    .then(() => deployer.deploy(YYFI))
    .then(() => deployer.deploy(YYCRV))
    .then(() => deployer.deploy(YALINK))
    .then(() => deployer.deploy(ALEND))
    .then(() => deployer.deploy(ASNX))
    .then(() => deployer.deploy(GNO))
    .then(() => deployer.deploy(_2KEY))
    .then(() => deployer.deploy(YETH))
    .then(() => deployer.deploy(AYFI))
    .then(() => deployer.deploy(UNI))
    .then(async () => {
      console.log("\nGetting contract instances...");

      // Volcie Token
      volcie = await Volcie.deployed();
      await volcie.initialize(accounts[0]);

      // YieldFarming
      yieldFarming = await YieldFarming.deployed();
      console.log("YieldFarming:", yieldFarming.address);

      // TOKENS
      superDaoToken = await SuperDaoToken.deployed();
      await superDaoToken.initialize("SuperDao", "SDAO", 18);
      await superDaoToken.mint(ERC20_TOKEN_SUPPLY);
      console.log('SDAO:', superDaoToken.address);
      kittieFightToken = await KittieFightToken.deployed();
      await kittieFightToken.initialize("KittieFightToken", "KTY", 18);
      await kittieFightToken.mint(ERC20_TOKEN_SUPPLY);
      console.log('KTY:',kittieFightToken.address);
      //kittieFightToken = await KittieFightToken.at(KTY_ADDRESS);
      //console.log(kittieFightToken.address)

      // uniswap kty
      weth = await WETH.deployed();
      console.log("weth:", weth.address);
      factory = await Factory.deployed();
      console.log("factory:", factory.address);
      dai = await Dai.deployed();
      await dai.initialize("Dai Stablecoin", "DAI", 18);
      await dai.mint(1);
      console.log("DAI:", dai.address);
      ant = await ANT.deployed();
      await ant.initialize("Aragon", "ANT", 18);
      await ant.mint(ERC20_TOKEN_SUPPLY);
      console.log("ANT:", ant.address)
      yDAI = await YDAI.deployed();
      await yDAI.initialize("iearn DAI", "yDAI", 18);
      await yDAI.mint(ERC20_TOKEN_SUPPLY);
      console.log("yDAI:", yDAI.address);
      yYFI = await YYFI.deployed();
      await yYFI.initialize("iearn iearn.finance", "yYFI", 18);
      await yYFI.mint(ERC20_TOKEN_SUPPLY);
      console.log("yYFI:", yYFI.address);
      yyCRV = await YYCRV.deployed();
      await yyCRV.initialize("iearn Curve DAO Token", "yCRV", 18);
      await yyCRV.mint(ERC20_TOKEN_SUPPLY);
      console.log("yyCRV:", yyCRV.address)
      yaLINK = await YALINK.deployed()
      await yaLINK.initialize("Aave Interest bearing LINK", "aLINK", 18);
      await yaLINK.mint(ERC20_TOKEN_SUPPLY);
      console.log("yaLINK:", yaLINK.address)
      aLend = await ALEND.deployed()
      await aLend.initialize("Aave Interest bearing LEND", "aLEND", 18);
      await aLend.mint(ERC20_TOKEN_SUPPLY);
      console.log("aLEND:", aLend.address)
      aSNX = await ASNX.deployed()
      await aSNX.initialize("Aave Interest bearing", "aSNX", 18);
      await aSNX.mint(ERC20_TOKEN_SUPPLY);
      console.log("aSNX:", aSNX.address)
      gno = await GNO.deployed()
      await gno.initialize("Gnosis", "GNO", 18);
      await gno.mint(ERC20_TOKEN_SUPPLY);
      console.log("GNO:", gno.address)
      _2key = await _2KEY.deployed()
      await _2key.initialize("TwoKeyEconomy", "2Key", 18);
      await _2key.mint(ERC20_TOKEN_SUPPLY);
      console.log("2Key:", _2key.address)
      yETH = await YETH.deployed()
      await yETH.initialize("iearn ETH", "yETH", 18);
      await yETH.mint(ERC20_TOKEN_SUPPLY);
      console.log("yETH:", yETH.address)
      aYFI = await AYFI.deployed()
      await aYFI.initialize("yearn.finance", "YFI", 18);
      await aYFI.mint(ERC20_TOKEN_SUPPLY);
      console.log("aYFI:", aYFI.address)
      uni = await UNI.deployed()
      await uni.initialize("Uniswap", "UNI", 18);
      await uni.mint(ERC20_TOKEN_SUPPLY);
      console.log("UNI:", uni.address)

      await factory.createPair(weth.address, kittieFightToken.address);
      const ktyPairAddress = await factory.getPair(
        weth.address,
        kittieFightToken.address
      );
      console.log("ktyWethPair address", ktyPairAddress);
      const ktyWethPair = await KtyWethPair.at(ktyPairAddress);
      console.log("ktyWethPair:", ktyWethPair.address);

      await factory.createPair(weth.address, dai.address);
      const daiPairAddress = await factory.getPair(weth.address, dai.address);
      console.log("daiWethPair address", daiPairAddress);
      const daiWethPair = await DaiWethPair.at(daiPairAddress);
      console.log("daiWethPair:", daiWethPair.address);

      await factory.createPair(ant.address, kittieFightToken.address);
      const ktyAntPairAddress = await factory.getPair(
        ant.address,
        kittieFightToken.address
      );
      console.log("ktyAntPair address", ktyAntPairAddress);
      const ktyAntPair = await KtyAntPair.at(ktyAntPairAddress);
      console.log("ktyAntPair:", ktyAntPair.address);

      await factory.createPair(yDAI.address, kittieFightToken.address);
      const ktyYDAIPairAddress = await factory.getPair(
        yDAI.address,
        kittieFightToken.address
      );
      console.log("ktyYDAIPair address", ktyYDAIPairAddress);
      const ktyYDAIPair = await KtyYDAIPair.at(ktyYDAIPairAddress);
      console.log("ktyyDAIPair:", ktyYDAIPair.address);

      await factory.createPair(yYFI.address, kittieFightToken.address);
      const ktyYYFIPairAddress = await factory.getPair(
        yYFI.address,
        kittieFightToken.address
      );
      console.log("ktyYYFIIPair address", ktyYYFIPairAddress);
      const ktyYYFIPair = await KtyYYFIPair.at(ktyYYFIPairAddress);
      console.log("ktyyYFIIPair:", ktyYYFIPair.address);

      await factory.createPair(yyCRV.address, kittieFightToken.address);
      const ktyYYCRVPairAddress = await factory.getPair(
        yyCRV.address,
        kittieFightToken.address
      );
      console.log("ktyYYCRVPair address", ktyYYCRVPairAddress);
      const ktyYYCRVPair = await KtyYYCRVPair.at(ktyYYCRVPairAddress);
      console.log("ktyYYCRVPair:", ktyYYCRVPair.address);

      await factory.createPair(yaLINK.address, kittieFightToken.address);
      const ktyYALINKPairAddress = await factory.getPair(
        yaLINK.address,
        kittieFightToken.address
      );
      console.log("ktyYALINKPair address", ktyYALINKPairAddress);
      const ktyYALINKPair = await KtyYALINKPair.at(ktyYALINKPairAddress);
      console.log("ktyYALINKPair:", ktyYALINKPair.address);

      await factory.createPair(aLend.address, kittieFightToken.address);
      const ktyALENDPairAddress = await factory.getPair(
        aLend.address,
        kittieFightToken.address
      );
      console.log("ktyALENDPair address", ktyALENDPairAddress);
      const ktyALENDPair = await KtyALENDPair.at(ktyALENDPairAddress);
      console.log("ktyALENDPair:", ktyALENDPair.address);

      await factory.createPair(aSNX.address, kittieFightToken.address);
      const ktyASNXPairAddress = await factory.getPair(
        aSNX.address,
        kittieFightToken.address
      );
      console.log("ktyASNXPair address", ktyASNXPairAddress);
      const ktyASNXPair = await KtyASNXPair.at(ktyASNXPairAddress);
      console.log("ktyASNXPair:", ktyASNXPair.address);

      await factory.createPair(gno.address, kittieFightToken.address);
      const ktyGNOPairAddress = await factory.getPair(
        gno.address,
        kittieFightToken.address
      );
      console.log("ktyGNOPair address", ktyGNOPairAddress);
      const ktyGNOPair = await KtyGNOPair.at(ktyGNOPairAddress);
      console.log("ktyGNOPair:", ktyGNOPair.address);

      await factory.createPair(_2key.address, kittieFightToken.address);
      const kty2keyPairAddress = await factory.getPair(
        _2key.address,
        kittieFightToken.address
      )
      console.log("kty2keyPair address", kty2keyPairAddress);
      const kty2keyPair = await Kty2keyPair.at(kty2keyPairAddress);
      console.log("kty2keyPair:", kty2keyPair.address);

      await factory.createPair(yETH.address, kittieFightToken.address);
      const ktyYETHPairAddress = await factory.getPair(
        yETH.address,
        kittieFightToken.address
      )
      console.log("ktyYETHPair address", ktyYETHPairAddress);
      const ktyYETHPair = await KtyYETHPair.at(ktyYETHPairAddress);
      console.log("ktyYETHPair:", ktyYETHPair.address);

      await factory.createPair(aYFI.address, kittieFightToken.address);
      const ktyAYFIPairAddress = await factory.getPair(
        aYFI.address,
        kittieFightToken.address
      )

      console.log("ktyAYFIPair address", ktyAYFIPairAddress);
      const ktyAYFIPair = await KtyAYFIPair.at(ktyAYFIPairAddress);
      console.log("ktyAYFIPair:", ktyAYFIPair.address);

      await factory.createPair(uni.address, kittieFightToken.address);
      const ktyUNIPairAddress = await factory.getPair(
        uni.address,
        kittieFightToken.address
      );
      console.log("ktyUNIPair address", ktyUNIPairAddress);
      const ktyUNIPair = await KtyUNIPair.at(ktyUNIPairAddress);
      console.log("ktyUNIPair:", ktyUNIPair.address);

      await factory.createPair(superDaoToken.address, kittieFightToken.address);
      const ktySDAOPairAddress = await factory.getPair(
        superDaoToken.address,
        kittieFightToken.address
      );
      console.log("ktySDAOPair address", ktySDAOPairAddress);
      const ktySDAOPair = await KtySDAOPair.at(ktyPairAddress);
      console.log("ktyWethPair:", ktySDAOPair.address);

      yieldFarmingHelper = await YieldFarmingHelper.deployed();
      console.log("yieldFarmingHelper:", yieldFarmingHelper.address);

      yieldsCalculator = await YieldsCalculator.deployed();
      console.log("yieldsCalculator:", yieldsCalculator.address);

      console.log("\nInitializing contracts...");

      const pairPoolAddrs = [
        ktyWethPair.address,
        ktyAntPair.address,
        ktyYDAIPair.address,
        ktyYYFIPair.address,
        ktyYYCRVPair.address,
        ktyYALINKPair.address,
        ktyALENDPair.address,
        ktyASNXPair.address,
        ktyGNOPair.address,
        kty2keyPair.address,
        ktyYETHPair.address,
        ktyAYFIPair.address,
        ktyUNIPair.address,
        ktySDAOPair.address
      ]

      const ktyUnlockRates = [
        300000, 250000, 150000, 100000, 100000, 100000
      ]

      const sdaoUnlockRates = [
        165000, 165000, 165000, 165000, 165000, 175000
      ]

      const latestBlock = await web3.eth.getBlock('latest');
      const programStartTime = latestBlock.timestamp; //Math.floor(new Date().getTime() / 1000)

      await yieldFarming.initialize(
        pairPoolAddrs,
        volcie.address,
        kittieFightToken.address,
        superDaoToken.address,
        yieldFarmingHelper.address,
        yieldsCalculator.address,
        ktyUnlockRates,
        sdaoUnlockRates,
        programStartTime
      );

      await yieldFarmingHelper.initialize(
        yieldFarming.address,
        yieldsCalculator.address,
        ktyWethPair.address,
        daiWethPair.address,
        kittieFightToken.address,
        superDaoToken.address,
        weth.address,
        dai.address
      );

      await yieldsCalculator.initialize(
        TOKENS_SOLD,
        yieldFarming.address,
        yieldFarmingHelper.address,
        volcie.address
      )

      await volcie.addMinter(yieldFarming.address);

      // set up Dai-Weth pair - only needed in truffle local test, not needed in rinkeby or mainnet
      const ethAmount = new BigNumber(
        web3.utils.toWei("10", "ether") //0.1 ethers
      );

      const daiAmount = new BigNumber(
        web3.utils.toWei("2419.154", "ether") //10 ethers * 241.9154 dai/ether = 2419.154 dai
      );

      await dai.mint(accounts[0], daiAmount);
      await dai.transfer(daiWethPair.address, daiAmount);
      await weth.deposit({value: ethAmount});
      await weth.transfer(daiWethPair.address, ethAmount);
      await daiWethPair.mint(accounts[0]);
    });
};
