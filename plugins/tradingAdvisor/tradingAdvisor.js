var util = require('../../core/util');
var _ = require('lodash');
var fs = require('fs');
var toml = require('toml');

//var config = util.getConfig();
var dirs = util.dirs();
var log = require(dirs.core + 'log');
var CandleBatcher = require(dirs.core + 'candleBatcher');

var moment = require('moment');


var Actor = function(done, pluginMeta) {
  _.bindAll(this);

  this.config = pluginMeta.config;

  var isLeecher = this.config.market && this. config.market.type === 'leech';

  this.done = done;
  //console.log(this.config); 

  this.batcher = new CandleBatcher(this.config.tradingAdvisor.candleSize);

  this.methodName = this.config.tradingAdvisor.method;

  this.setupTradingMethod();

  var mode = util.gekkoMode();

  // the stitcher will try to pump in historical data
  // so that the strat can use this data as a "warmup period"
  //
  // the realtime "leech" market won't use the stitcher
  if(mode === 'realtime' && !isLeecher) {
    var Stitcher = require(dirs.tools + 'dataStitcher');
    var stitcher = new Stitcher(this.batcher);
    stitcher.prepareHistoricalData(done);
  } else
    done();
}

util.makeEventEmitter(Actor);

Actor.prototype.setupTradingMethod = function() {

  if(!fs.existsSync(dirs.methods + this.methodName + '.js'))
    util.die('Gekko can\'t find the strategy "' + this.methodName + '"');

  log.info('\t', 'Using the strategy: ' + this.methodName);

  var method = require(dirs.methods + this.methodName);

  // bind all trading method specific functions
  // to the Consultant.
  var Consultant = require('./baseTradingMethod');

  _.each(method, function(fn, name) {
    Consultant.prototype[name] = fn;
  });

  if(this.config[this.methodName]) {
    var tradingSettings = this.config[this.methodName];
  }

  this.method = new Consultant(tradingSettings);
  this.method
    .on('advice', this.relayAdvice);

  this.method
    .on('trade', this.processTrade);

  this.batcher
    .on('candle', this.processCustomCandle);
}

// HANDLERS
// process the 1m candles
Actor.prototype.processCandle = function(candle, done) {
  this.batcher.write([candle]);
  done();
}

// propogate a custom sized candle to the trading method
Actor.prototype.processCustomCandle = function(candle) {
  this.method.tick(candle);
}

Actor.prototype.processTrade = function(trade) {
  this.method.processTrade(trade);
}

// pass through shutdown handler
Actor.prototype.finish = function(done) {
  this.method.finish(done);
}

// EMITTERS
Actor.prototype.relayAdvice = function(advice) {
  this.emit('advice', advice);
}


module.exports = Actor;
