'use strict';
var _ = require('lodash');
var log = require('../core/log.js');
var util = require('../core/util.js');
var config = util.getConfig();
var amqp = require('amqplib');
require('dotenv').config();

const watchConfig = config.watch;
const tradingAdvisorConfig = config.tradingAdvisor;

var RabbitMQ = function(done) {

    this.done = done;

    this.price = 'N/A';
    this.marketTime = {format: function() {return 'N/A'}};
    _.bindAll(this);

    createChannel().then((rabbitmq) => {
      this.channel = rabbitmq[0];
      this.connection = rabbitmq[1];
      done()});
};

RabbitMQ.prototype.processCandle = function(candle, done) {
    this.price = candle.close;
    this.marketTime = candle.start;

    // add extra information
    candle.starttm = candle.start.unix() //we need unix-ts as number
    candle.currency = watchConfig.currency;
    candle.asset = watchConfig.asset;
    candle.exchange = watchConfig.exchange;
    sendToQueue(candle, "QUOTE", this.channel, false, true)
    done();
};

RabbitMQ.prototype.processAdvice = function(advice) {

  if (advice.recommendation!=null){
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

    sendToQueue(advice, "GEKKO", this.channel)
  }
};

RabbitMQ.prototype.finalize = function(done) {
  this.connection.close();
  done();
};


async function createChannel(connectionStr = 'amqp://localhost'){
  const connection = await amqp.connect(connectionStr);
  const channel = await connection.createChannel();
  return [channel,connection];
}

async function sendToQueue(advice, queuename, channel, persistent = true, exclusive = false){
  await channel.assertQueue(queuename, {durable: true}); //specific queue

  return new Promise( (resolve, reject) => {
      const json = JSON.stringify(advice);
      log.info("sending object ..."+json);
      channel.sendToQueue(queuename, new Buffer(json), {persistent: persistent, exclusive : exclusive});
      resolve(true);
  });
}
async function publishToExchange(advice, exchange, queuename, channel, type = 'direct'){
  await channel.assertExchange(exchange, type, {durable: true})
  await channel.assertQueue(queuename, {durable: true}); //specific queue
  await channel.bindQueue(queuename, exchange,'')

  return new Promise( (resolve, reject) => {
      const json = JSON.stringify(advice);
      log.info("publish advice ..."+json);
      channel.publish(exchange, '', new Buffer(json), {persistent: true});
      resolve(true);
  });
}

module.exports = RabbitMQ;
