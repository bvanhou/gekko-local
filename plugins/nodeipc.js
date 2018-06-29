'use strict';
var _ = require('lodash');
var log = require('../core/log.js');
const ipc=require('node-ipc');
require('dotenv').config();

var NodeIPC = function(done, pluginMeta) {

    this.done = done;
    this.config = pluginMeta.config;

    this.price = 'N/A';
    this.marketTime = {format: function() {return 'N/A'}};
    _.bindAll(this);

    createClient(this.config.nodeipc.connectionid, this.config.nodeipc.serverpath).then(() =>   done());
};

//
NodeIPC.prototype.processCandle = function(candle, done) {
    this.price = candle.close;
    this.marketTime = candle.start;
    this.candle = candle;

    done();
};

NodeIPC.prototype.processAdvice = function(advice) {

  if (advice.recommendation!=null && this.config.nodeipc.enableProcessAdvice){
    console.log()
    log.info('We have new trading advice for '+this.candle.asset + ' '+this.candle.currency + ' strategy: '+this.config.tradingAdvisor.method);
    log.info('\t Position:', advice.recommendation);
    log.info('\t Market price:', this.price);
    log.info('\t Based on market time:', this.marketTime.format('YYYY-MM-DD HH:mm:ss'));
    console.log()

    advice.price = this.price;
    advice.marketTime = this.marketTime;

    //TODO! here something is wrong
    advice.currency = this.candle.currency;
    advice.asset = this.candle.asset;
    advice.exchange = this.config.watch.exchange;
    advice.strategy = this.config.tradingAdvisor.method;

    sendToQueue(advice, this.config.nodeipc.connectionid, "new_advice")
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
