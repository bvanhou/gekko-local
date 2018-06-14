'use strict';
var _ = require('lodash');
var log = require('../core/log.js');
var util = require('../core/util.js');
var config = util.getConfig();
const ipc=require('node-ipc');
require('dotenv').config();

const watchConfig = config.watch;
const tradingAdvisorConfig = config.tradingAdvisor;

var NodeIPC = function(done) {

    this.done = done;

    this.price = 'N/A';
    this.marketTime = {format: function() {return 'N/A'}};
    _.bindAll(this);

    createClient(config.nodeipc.connectionid, config.nodeipc.serverpath).then(() =>   done());
};

//
NodeIPC.prototype.processCandle = function(candle, done) {
    this.price = candle.close;
    this.marketTime = candle.start;

    if (config.nodeipc.enableProcessCandle){
      // add extra information
      candle.starttm = candle.start.unix() //we need unix-ts as number
      candle.currency = watchConfig.currency;
      candle.asset = watchConfig.asset;
      candle.exchange = watchConfig.exchange;
      sendToQueue(candle, config.nodeipc.connectionid, "new_quote")
    }
    done();
};

NodeIPC.prototype.processAdvice = function(advice) {

  if (advice.recommendation!=null && config.nodeipc.enableProcessAdvice){
    console.log()
    log.info('We have new trading advice!');
    log.info('\t Position:', advice.recommendation);
    log.info('\t Market price:', this.price);
    log.info('\t Based on market time:', this.marketTime.format('YYYY-MM-DD HH:mm:ss'));
    console.log()

    advice.price = this.price;
    advice.marketTime = this.marketTime;

    advice.currency = watchConfig.currency;
    advice.asset = watchConfig.asset;
    advice.exchange = watchConfig.exchange;
    advice.strategy = tradingAdvisorConfig.method;

    sendToQueue(advice, config.nodeipc.connectionid, "new_advice")
  }
};

NodeIPC.prototype.finalize = function(done) {
  ipc.disconnect('tradingbot');
  done();
};


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

async function sendToQueue(advice, connectionid, messagetype){

  return new Promise( (resolve, reject) => {
      ipc.of[connectionid].emit(messagetype, advice);
      resolve(true);
  });
}

module.exports = NodeIPC;
