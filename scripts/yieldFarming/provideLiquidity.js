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

const KittieFightToken = artifacts.require("KittieFightToken");
const WETH = artifacts.require("WETH9");
const Factory = artifacts.require("UniswapV2Factory");
const KtyWethPair = artifacts.require("IUniswapV2Pair");
const KtyUniswapOracle = artifacts.require("KtyUniswapOracle");

//truffle exec scripts/FE/yieldFarming/provideLiquidity.js noOfUsers(uint) (Till 39)

module.exports = async callback => {
  try {
    let ktyUniswapOracle = await KtyUniswapOracle.deployed();
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

    let ktyReserve = await ktyUniswapOracle.getReserveKTY();
    let ethReserve = await ktyUniswapOracle.getReserveETH();
    console.log("reserveKTY:", weiToEther(ktyReserve));
    console.log("reserveETH:", weiToEther(ethReserve));

    let ether_kty_price = await ktyUniswapOracle.ETH_KTY_price();
    let kty_ether_price = await ktyUniswapOracle.KTY_ETH_price();
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
    let daiReserve = await ktyUniswapOracle.getReserveDAI();
    let ethReserveFromDai = await ktyUniswapOracle.getReserveETHfromDAI();
    console.log("reserveDAI:", weiToEther(daiReserve));
    console.log("reserveETH:", weiToEther(ethReserveFromDai));

    let ether_dai_price = await ktyUniswapOracle.ETH_DAI_price();
    let dai_ether_price = await ktyUniswapOracle.DAI_ETH_price();
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

    let kty_dai_price = await ktyUniswapOracle.KTY_DAI_price();
    let dai_kty_price = await ktyUniswapOracle.DAI_KTY_price();
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

    callback();
  } catch (e) {
    callback(e);
  }
};
