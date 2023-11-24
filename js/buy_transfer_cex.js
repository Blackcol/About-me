/* 
  auto buy if required, send the funds to wallet provided, designed just to be fast and simple..
  this connect to an exchange API
*/
global.agModule = "main";
import logger from './modules/logger.js';
import spot from './modules/spot.js';
import account from './modules/account.js';
import { timeout } from './modules/utils.js';

let investment = 1000;// put value according to coin example 10 bnb or 100 usdt
let typeOfWithdraw = 'exact'; //if not "exact" will withdraw 100% avaible - fees
let coin = 'USDT';
let canBuy = false;
let chain = 'ETH'; //TRX BSC MATIC BTC LTC ETH ARBI SOL
let destiny = '0x0';

let pair = 'USDT';
async function init() {
  console.log("Getting balances");
  let balances = await account.balanceOfAsset();
  console.log(`${pair} available: ${balances[pair]}`);
  // let coinBalance = balances[coin] ?? 0;
  console.log(`${coin} available: ${balances[coin]}`);
  console.log("Getting coin info for withdrawl");
  let withdrawlInfo = await account.getCoinInfo(coin);
  // return console.log(withdrawlInfo)
  let withdrawFee = parseFloat(withdrawlInfo.chains.filter(data => data.chain == chain)[0].withdraw_fee);
  if (!withdrawFee || isNaN(withdrawFee)) return console.error("bad withdrawFee", { withdrawFee });
  //check if has enough balance + fee
  let enoughBalance = balances[coin] >= (investment + withdrawFee);
  let bought = false;
  if (!enoughBalance && canBuy) {
    if (balances[pair] < (investment + withdrawFee)) return console.error("Not enough pair", { pair: balances[pair] })
    //check if is a stable
    let isStable = ['USDT', 'BUSD'].includes(coin);
    let coinPrice = parseFloat(await spot.getLastPrice({ asset: coin }));
    console.log(`${coin} price: ${coinPrice}`)
    let usdtRequired = (investment + withdrawFee - balances[coin]) * coinPrice
    usdtRequired += usdtRequired * 0.01; // +1% for fees and spread

    console.log(`Buying ${(investment + withdrawFee)}} ${coin}`, { balance: balances[coin], usdtToUse: usdtRequired, price: coinPrice });
    bought = await spot.createOrder({
      side: 'Buy',
      type: 'MARKET',
      asset: coin,
      pair,
      price: 0,
      quantity: usdtRequired,
      decimals: 2
    })
    //update balances
    balances = await account.balanceOfAsset();
  }

  if (!enoughBalance && !bought && canBuy) return console.error("Not enough balance and didnt bought!", { balance: balances[coin], bought })
  let amountToWithdraw = balances[coin] - withdrawFee; // 100% free of desired token
  if (typeOfWithdraw == 'exact') amountToWithdraw = investment - 0; //for withdraw stables or limited amounts
  // let amountToSend = withdrawlInfo.chains.filter(data => data.chain == 'BSC')[0].withdraw_min;

  console.log(`Withdrawing ${coin}`, { amount: amountToWithdraw, available: balances[coin], type: typeOfWithdraw, fee: withdrawFee });
  await account.withdraw({ coin, chain, address: destiny, amount: amountToWithdraw, tag: '' })
}
init();