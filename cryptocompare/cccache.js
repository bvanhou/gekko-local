const ipc = require ('node-ipc');
const _ = require('lodash');
const moment = require('moment');

const cc = require ('./cc');
var util = require('./../core/util');

const log = require ('../core/log');

// substitue for a exchange
var CcCache = function(config) {
  _.bindAll(this);
  this.pairMap = new Map();

  this.exchange = config.exchange.toLowerCase();

  var Trader = require(util.dirs().exchanges + this.exchange);
  capabilities = Trader.getCapabilities();

  if(_.isObject(config)) {
    this.currency = config.currency.toUpperCase()
    this.asset = config.asset.toUpperCase();
  }

  this.name = 'cryptocompare';
  this.since = null;

  this.market = _.find(capabilities.markets, (market) => {
    return market.pair[0] === this.currency && market.pair[1] === this.asset
  });

  this.pair = this.market.book;

  //if a map from cc is empty, we are probably in child process. Than create ipc-client
  if (cc.getPairsMap().size === 0){
    createCcCache(config.asset.toUpperCase(), config.currency.toUpperCase(), this.exchange);
  }else{
    this.pairMap = cc.getPairsMap();
  }
}

function createCcCache(asset, currency, exchange){
  if (asset == 'XBT')
    asset = 'BTC';
  if (currency == 'XBT')
    currency = 'BTC';

  createClient('cryptocompare','/tmp/cc.cryptocompare').then(()=>{
    recieveFromQueue('cryptocompare', 'quota',(newTrade)=>{
      log.debug('got new quote: '+newTrade.asset + ' '+newTrade.currency + ' '+newTrade.exchange);
      if (newTrade.asset == asset && newTrade.currency==currency && newTrade.exchange == exchange){
        const key = asset + currency+  exchange;
        this.pairMap.set(key.toUpperCase(), newTrade);
      }
    });
  })
}

CcCache.prototype.getTrades = function(since, callback, descending) {
  let asset = this.asset;
  let currency = this.currency;
  if (asset == 'XBT')
    asset = 'BTC';
  if (currency == 'XBT')
    currency = 'BTC';

  const key = asset + currency+  this.exchange;
  const trade = this.pairMap.get(key.toUpperCase());
  var parsedTrades = [];

  // var newTrade = {
  //   asset: fsym,
  //   currency: tsym,
  //   exchange: incomingTrade['M'],
  //   type: incomingTrade['T'],
  //   id: incomingTrade['ID'],
  //   price: incomingTrade['P'],
  //   quantity: incomingTrade['Q'],
  //   total: incomingTrade['TOTAL']
  // };


  if (trade){
    parsedTrades.push({
      tid: moment.unix(trade.id).valueOf() * 1000000,
      date: parseInt(Math.round(trade.timestamp), 10),
      price: parseFloat(trade.price),
      amount: parseFloat(trade.quantity),
      asset: trade.asset,
      currency: trade.currency,
      exchange: trade.exchange
    });
  }

  if(descending)
    callback(undefined, parsedTrades.reverse());
  else
    callback(undefined, parsedTrades);
}

function createClient(connectionid, serverpath){
  const id = (Math.random() + '').slice(3);
  ipc.config.id = id;
  ipc.config.retry = 1000;
  ipc.config.silent= true;

  const promise = new Promise((resolve, reject) => {
    ipc.connectTo(connectionid,serverpath, () => {
      resolve(true);
    });
  })

  return promise;
}

function recieveFromQueue(queuename, messagetype, func){
  ipc.of[queuename].on(messagetype, (data)=>{
    func(data)
  });
}

module.exports = CcCache;
