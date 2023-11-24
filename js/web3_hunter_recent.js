//@ts-check
/* should be modular and have essential methods to adapt to any strategy */
import fs from 'fs';
import { query } from './modules/db.js';
import { getLogger } from "./logger.js";
import { scanner2 } from './scannerV2.js';
import utils from "./utils.js";

const logger = getLogger({ name: 'hunter', path: utils.resolvePath('../logs/hunter') })

let paths = { cache: '../cache/hunter.json', cexWallets: '../cache/cex_wallets.json' }
/**
 * @typedef {import("web3").Web3} Web3
 */

/**
 * Represents a data object with specific properties.
 * @typedef {Object} WalletProps
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {number} nextUpdate
 * @property {string} lastHash
 * @property {number} lastBn
 * @property {Object} validations
 * @property {number} validations.txsQty
 * @property {boolean} validations.gwei
 * @property {boolean} validations.forceInvalid
 * 
 */

/**
 * Represents the cache object for the 'db' and 'temp' properties.
 * @typedef {Object.<string, WalletProps>} WalletObj
 */

/**
 * Represents the cache object with specific properties.
 * @typedef {Object} HunterCache
 * @property {WalletObj} db - The 'db' property with string keys and DataObject values.
 * @property {WalletObj} temp - The 'temp' property with string keys and DataObject values.
 * @property {Object} states - The 'states' property.
 * @property {Object} states.db - The 'db' property under 'states'.
 * @property {number} states.db.updatedAt - The 'updatedAt' property under 'states.db'.
 * @property {number} states.db.lastBn - The 'lastBn' property under 'states.db'.
 * @property {Object} states.temp - The 'temp' property under 'states'.
 * @property {number} states.temp.updatedAt - The 'updatedAt' property under 'states.temp'.
 * @property {number} states.temp.lastBn - The 'lastBn' property under 'states.temp'.
 * @property {Object} states.file - The 'file' property under 'states'.
 * @property {number} states.file.updatedAt - The 'updatedAt' property under 'states.file'.
 * @property {number} states.file.jsonLen - The 'jsonLen' property under 'states.file'.
 */


class Hunter {
  constructor(_web3, gwei, caller = '') {
    if (!_web3) throw this.agError('constructor', '_web3 invalid', { _web3 })
    /** @type {Web3} */
    this.web3 = _web3;
    try {
      /** @type {HunterCache} */
      this.cache = utils.parseJsonFile(paths.cache);
    } catch (error) {
      throw this.agError('parseJsonFile', 'unexpected error', { path: paths.cache, error })
    }
    try {
      this.cexWallets = utils.parseJsonFile(paths.cexWallets);
      this.bnbAdressList = Object.values(this.cexWallets.binance).map(x => x.address.toLowerCase());
    } catch (error) {
      throw this.agError('parseJsonFile', 'unexpected error', { path: paths.cexWallets, error })
    }

    if (!this.bnbAdressList) throw this.agError('constructor', 'invalid bnbAddressList', { path: paths.cexWallets, cexWallets: this.cexWallets });
    if (!this.cache.db) this.cache.db = {};
    if (!this.cache.temp) this.cache.temp = {};
    if (!this.cache.states) this.cache.states = { db: { updatedAt: 0, lastBn: 0 }, temp: { updatedAt: 0, lastBn: 0 }, file: { updatedAt: 0, jsonLen: 0 } };
    this.updateTimes = { active: 3 * 24 * 60 * 60 * 1000, inactive: 9 * 24 * 60 * 60 * 1000, invalid: 999 * 24 * 60 * 60 * 1000 }
    this.pause = false;
    this.gwei = gwei;

    logger.info("Hunter loaded", { from: caller, states: this.cache.states })
    logger.debug("cache", this.cache);
  }

  async init(timer) {
    if (timer == 0) {
      this.initUpdater(0);
      logger.info("Hunter.init initialiazed..");
    }

    this.cache.states.temp.lastBn = await this.getLastBn(); // store at this moment what is the last bn
    try {
      // update based on lastBn
      // create a list of pendings based on temp data to check in db
      // if any temp wallet is found in db, remove it from temp

      let pendings = await this.search();
      this.processPendings(pendings);


    } catch (error) {
      console.log("Hunter.init agError", { error });
      logger.info("Hunter.init agError", { error });
    } finally {
      await utils.timeout(timer);
      this.init(30 * 1000); //every 60 seconds
    }
  }

  async initUpdater(timer = 0) {
    try {
      await utils.timeout(timer);
      if (this.pause) return this.initUpdater(15000);
      let startTime = Date.now();
      let cacheStr = JSON.stringify(this.cache);
      let prevJsonLen = this.cache.states.file.jsonLen;
      if (prevJsonLen > cacheStr.length || (Date.now() - this.cache.states.file.updatedAt) > 180000) {
        let prevUpdate = this.cache.states.file.updatedAt;
        await utils.writeFileAsync(paths.cache, cacheStr, (error) => {
          console.log("hunter.initUpdater agError", { error });
          logger.log("hunter.initUpdater writeFileAsync agError", { error, time: Date.now() - startTime, lenDiff: cacheStr.length - prevJsonLen, prevUpdate: new Date(prevUpdate).toISOString() });
        }, () => {
          logger.log("updated cache!", { time: Date.now() - startTime, lenDiff: cacheStr.length - prevJsonLen, prevUpdate: new Date(prevUpdate).toISOString() });
          this.cache.states.file.updatedAt = Date.now();
          this.cache.states.file.jsonLen = cacheStr.length;
        })
      }
    } catch (error) {
      console.log("hunter.initUpdater agError", { error });
      logger.log("hunter.initUpdater catch agError", { error });
    }

    this.initUpdater(15000);
  }

  async getLastBn() {
    let result = await query('select blocknumber from transfers order by blocknumber DESC limit 1')
    if (result && result[0]) return parseFloat(result[0].blocknumber);

    logger.error("Hunter.getLastBn agError: invalid result", { result })
    return this.cache.states.temp.lastBn;
  }

  async search() {
    let result = await query(`SELECT transfers.to FROM transfers 
    where transfers.ts >= ? and
    blocknumber >= ? and
    transfers.amount > 6 and
    EXISTS (
      SELECT 1
      FROM bets
      WHERE bets.from = transfers.to and
      bets.gas_price = 7
      LIMIT 1
    ) and
    transfers.from IN (${this.bnbAdressList.map(() => '?').join(',')})
    order by transfers.ts desc
    limit 1000`, [this.cache.states.db.lastBn])
    if (!result) throw this.agError("search", "invalid result", { result });

    logger.info(`Hunter.search: found ${result.length} wallets from ${this.cache.states.db.lastBn}`)

    return result;
  }

  /** @param {string[]} pendings */
  async processPendings(pendings) {
    for (const wallet of pendings) {
      logger.info(`Hunter.processPendings: processing ` + wallet)
      if (!this.cache.db[wallet]) {
        this.cache.db[wallet] = {
          createdAt: (new Date()).toISOString(),
          updatedAt: '',
          nextUpdate: 15000,
          lastHash: '0x0',
          lastBn: 0,
          validations: {
            txsQty: 0,
            gwei: false,
            forceInvalid: false,
          }
        }
        logger.info(`Hunter.processPendings: cached ` + wallet)
      }

      this.cache.db[wallet].updatedAt = (new Date()).toISOString();
      this.cache.db[wallet].nextUpdate += Date.now();
      this.cache.db[wallet].lastBn = this.cache.states.temp.lastBn;

      await this.validateTxQty(wallet);
      await this.validateGwei(wallet);
    }

  }

  /** @param {string} wallet */
  async validateTxQty(wallet) {
    try {
      /** @type {string[]} */
      let data = await scanner2.queryTransactions(wallet, 0, this.cache.states.temp.lastBn, 500, 'desc');
      if (!data) throw this.agError('validateTxQty', 'invalid data', { wallet, data });
      if (data.length < 300) {
        if (data.length == 0) {
          this.cache.db[wallet].validations.forceInvalid = true;
          throw this.agError('validateTxQty', 'data length is zero!', data);
        }

        if (this.cache.db[wallet].validations.txsQty < data.length) {
          this.cache.db[wallet].nextUpdate += this.updateTimes.active;
          this.cache.db[wallet].validations.txsQty = data.length;
        }
      } else {
        this.cache.db[wallet].nextUpdate += this.updateTimes.inactive;
      }
    } catch (error) {
      logger.error(`Hunter.validateTxQty agError: api proccess`, { error, wallet })
    }
  }

  /** @param {string} wallet */
  async validateGwei(wallet) {
    try {
      let data = await query(`select bets.from from bets where bets.from = ? and blocknumber <= ?`, [wallet, this.cache.states.temp.lastBn]);
      if (!data) throw this.agError('validateGwei', 'invalid data', { wallet, data });
      if (data.length == 0) return logger.info(`Hunter.validateGwei: didnt find bets for ${wallet}`);
      for (const tx of data) {
        tx.gas_price = parseFloat(tx.gas_price);
        if (isNaN(tx.gas_price)) throw this.agError('validateGwei', 'invalid gas_price', { tx })
        if (this.isValidGwei(tx.gas_price)) return this.cache.db[wallet].validations.gwei = true;

        this.cache.db[wallet].validations.gwei = false;
      }
    } catch (error) {
      logger.error(`Hunter.validateGwei agError: api proccess`, { error, wallet })
    }
  }

  isValidGwei(gwei){
    return this.gwei == gwei;
  }

  //TODO: function that iterates valid bots and check balances every 4 min

  /**
   * @param {string} wallet 
   * @returns {boolean}
   */
  isValid(wallet) {
    return false;
  }

  agError(func, msg, obj = {}) {
    return { msg: `Hunter.${func} agFError: ${msg}`, ...obj }
  }
}

export default Hunter;