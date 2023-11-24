import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import fBybit from '../bybit_v5/modules/futures.js';
import bybit_http from '../bybit_v5/modules/http.js';
import fBinance from '../binance/modules/futures.js';
import sBinance from '../binance/modules/spot.js';
import { timeout, reduceDecimals } from '../bybit/modules/utils.js';

// replace the value below with the Telegram token you receive from @BotFather
const token = 'xx';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true, timeout: 2, interval: 5 });
let allowedMethods = ['/statistics', '/arbitrage_info', '/spread']
let allowedUsers = ['0x0']
let bannedUsers = ['0x0']
const http = new bybit_http('futures', 'main');
fBybit.setHttp(http);


// Listen for any kind of message. There are different kinds of messages.
async function sendMessages(bot, chatId, messages) {
  for (let i = 0; i < messages.length; i++) {
    const text = messages[i];
    await bot.sendMessage(chatId, text);
    await timeout(100);
  }
}

bot.on('message', async (msg) => {
  let chatId = msg.chat.id;
  try {
    // send a message to the chat acknowledging receipt of their message
    if (bannedUsers.includes(msg.from.username)) return
    if (!allowedUsers.includes(msg.from.username)) return bannedUsers.push(msg.from.username) && bot.sendMessage(chatId, 'Contact admin');
    if (!allowedMethods.includes(msg.text)) return;

    // bot.sendMessage(chatId, 'Received your message');
    console.log("request from", chatId)
    let dataToPrint = '';
    switch (msg.text) {
      case '/statistics':
        dataToPrint = getArrTextOfStatistics();
        break;
      case '/arbitrage_info':
        dataToPrint = await getArbitrageInfo('bybit');
        dataToPrint = dataToPrint.concat(await getArbitrageInfo('binance'));
        break;
      case '/spread':
        dataToPrint = await getSpreads();

        break;
      default:
        break;
    }

    await sendMessages(bot, chatId, dataToPrint);
    bot.sendMessage(chatId, '\nE\nN\nD');
  } catch (error) {
    console.log(error);
    let msg = 'default_error';
    try {
      msg = JSON.stringify(error, null, 2);
    } catch (error2) {
      bot.sendMessage(chatId, 'Unknown error happened' + error2);
    }
    bot.sendMessage(chatId, 'An error happened ' + msg);
  }
});

function getArrTextOfStatistics() {
  let rawdata = fs.readFileSync('../config/statistics.json');
  let statsData = JSON.parse(rawdata);
  let arrStats = Object.entries(statsData.bots);
  let arrText = [];
  let resumeObj = {};
  let arrResumeText = [];

  for (let i = 0; i < arrStats.length; i++) {
    let key = arrStats[i][0];
    let value = arrStats[i][1];
    if (!key.includes('bear') && !key.includes('bull') && !key.includes('strat'))
      continue;

    let sign = '          ';
    if (statsData.bots[key].tmpLs >= 4)
      sign = '********************';
    // statsData.bots[key].strat = key;
    arrText.push(`${sign} ${key} ${sign}`)
    arrText.push(JSON.stringify(statsData.bots[key], null, 2))
    let resumeText = `${key}: pnl: ${statsData.bots[key].statistics.pnl} tmpWs: ${statsData.bots[key].statistics.tmpWs} tmpLs: ${statsData.bots[key].statistics.tmpLs}`
    arrResumeText.push(resumeText)
  }

  arrText.push('Quick Stats');
  arrText = arrText.concat(arrResumeText);
  return arrText;
}

async function getArbitrageInfo(exchange) {
  let coinData, fundingData, top20;
  switch (exchange) {
    case 'bybit':
      // coinData = await fBybit.getKline({ asset: '' });
      coinData = await fBybit.getTicker({ asset: '' });

      fundingData = coinData.list.reduce((prev, next) => {
        let fundingRate = next.fundingRate * 100;
        let orderType = fundingRate < 0 ? 'Buy' : 'Sell'
        fundingRate = fundingRate < 0 ? fundingRate * -1 : fundingRate
        fundingRate = reduceDecimals(fundingRate, 4);
        next.nextFundingTime *= 1
        prev.push({ symbol: next.symbol, fundingRate, nextFunding: new Date(next.nextFundingTime).toISOString(), orderType, minAway: reduceDecimals(((new Date(next.nextFundingTime)).getTime() - Date.now()) / (60 * 1000), 2), })
        return prev;
      }, [])
      fundingData = fundingData.sort((prev, next) => {
        return prev.fundingRate >= next.fundingRate ? -1 : 1
      })
      top20 = fundingData.slice(0, 20);
      top20.sort((prev, next) => {
        if (prev.minAway == next.minAway) return prev.fundingRate >= next.fundingRate ? -1 : 1
        return prev.minAway <= next.minAway ? -1 : 1
      })
      top20 = top20.filter((data) => {
        if (data.fundingRate >= 0.2) return true
      })
      // console.log(JSON.stringify({ top20 }, null, 2))
      return objToMsg({ bybit: top20 });
    case 'binance':
      //   {
      //     "symbol": "AMBBUSD",
      //     "markPrice": "0.01335800",
      //     "indexPrice": "0.01351214",
      //     "estimatedSettlePrice": "0.01360056",
      //     "lastFundingRate": "-0.01075721",
      //     "interestRate": "0.00010000",
      //     "nextFundingTime": 1670918400000,
      //     "time": 1670897148000
      // }
      coinData = await fBinance.getFundingData();
      fundingData = coinData.reduce((prev, next) => {
        let fundingRate = next.lastFundingRate * 100;
        let orderType = fundingRate < 0 ? 'Buy' : 'Sell'
        fundingRate = fundingRate < 0 ? fundingRate * -1 : fundingRate
        fundingRate = reduceDecimals(fundingRate, 4);

        prev.push({ symbol: next.symbol, fundingRate, nextFunding: new Date(next.nextFundingTime).toISOString(), orderType, minAway: reduceDecimals(((new Date(next.nextFundingTime)).getTime() - Date.now()) / (60 * 1000), 2), })
        return prev;
      }, [])
      fundingData = fundingData.sort((prev, next) => {
        return prev.fundingRate >= next.fundingRate ? -1 : 1
      })
      top20 = fundingData.slice(0, 20);
      top20.sort((prev, next) => {
        if (prev.minAway == next.minAway) return prev.fundingRate >= next.fundingRate ? -1 : 1
        return prev.minAway <= next.minAway ? -1 : 1
      })
      top20 = top20.filter((data) => {
        if (data.fundingRate >= 0.2) return true
      })
      // console.log(JSON.stringify({ top20 }, null, 2))
      return objToMsg({ binance: top20 });
    default:
      break;
  }

}

function objToMsg(obj) {
  let arrText = [];
  let keys = Object.keys(obj);
  let maxLoop = keys.length;
  for (let i = 0; i < maxLoop; i++) {
    let key = keys[i];
    arrText.push(key)
    arrText.push(JSON.stringify(obj[key], null, 2))
  }
  return arrText;
}

async function getSpreads() {
  const bannedSymbols = ['COCOSUSDT', 'HNTUSDT', 'YFII'] // invalid symbols on binance spot
  //get all the data
  let bi = { fTickers: await fBinance.getTickers(), sTickers: await sBinance.getTickers24(), spreads: [] };
  let by = { fTickers: (await fBybit.getTicker({ asset: '' })).list, spreads: {} };
  by.fTickers = by.fTickers.reduce((acum, item, idx) => {
    acum[item.symbol] = parseFloat(item.lastPrice);

    return acum;
  }, {});

  // binance

  let spreads = [];
  Object.entries(bi.fTickers).forEach((item, idx) => {
    let symbol = item[0];
    if (bi.sTickers[symbol] && !bannedSymbols.includes(symbol)) spreads.push({ symbol, spread: calcDiff(bi.fTickers[symbol], bi.sTickers[symbol]), fBi: bi.fTickers[symbol], fBy: by.fTickers[symbol] || -1, s: bi.sTickers[symbol] });
  })

  let usdt = sortSpreads(spreads);
  bi.spreads = usdt.slice(0, 20).filter(item => Math.abs(item.spread) >= 0.3);

  // bybit
  spreads = [], usdt = [];
  Object.entries(by.fTickers).forEach((item, idx) => {
    let symbol = item[0];
    if (bi.sTickers[symbol] && !bannedSymbols.includes(symbol)) spreads.push({ symbol, spread: calcDiff(by.fTickers[symbol], bi.sTickers[symbol]), fBy: by.fTickers[symbol], fBi: bi.fTickers[symbol] || -1, s: bi.sTickers[symbol] });
  })

  usdt = sortSpreads(spreads)
  by.spreads = usdt.slice(0, 20).filter(item => Math.abs(item.spread) >= 0.5);

  return objToMsg({ binance: bi.spreads, bybit: by.spreads });
}

const calcDiff = (a, b) => {
  return reduceDecimals(((a - b) * 100) / a, 3);
}

function sortSpreads(arr) {
  return arr.slice(0).filter(item => item.symbol.includes('USDT')).sort((_a, _b) => {
    if (!_a.symbol.includes('USDT')) return 1;
    let a = Math.abs(_a.spread), b = Math.abs(_b.spread);
    return a > b ? -1 : 1;
  })
}