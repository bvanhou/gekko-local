// skeleton example of strategy that operates on multiple timeframes
//
//

var log = require('../core/log');
var util = require('../core/util.js');

const CandleBatcher = require('../core/candleBatcher');
var CCI = require('./indicators/CCI_without_LRC.js');
var SMA = require('./indicators/SMA.js');

var dirs = util.dirs();
var tulind = require(dirs.core + 'tulind');

var helper = require('../plugins/strategieshelper.js');

/////////////////////////////////////////////////////////////////////
var strat = {};

/////////////////////////////////////////////////////////////////////
strat.init = function() {

  log.debug('Initialising multi timeframe strategy');
  log.debug('stopBuffer=' + this.settings.stopBuffer + ' profitRatio=' + this.settings.profitRatio);

  // since we're relying on batching 1 minute candles into ShorterPeriod and LongerPeriod minute candles
  // lets throw if the settings are wrong
  if (this.tradingAdvisor.candleSize !== 1) {
    throw "This strategy must run with candleSize=1";
  }

  this.candleSizeShorterPeriod = 240;
  this.candleSizeLongerPeriod = 720;

  // create candle batchers for ShorterPeriod and LongerPeriod minute candles
  // ShorterPeriod x 1 minute candle
  this.batcherShorterPeriod = new CandleBatcher(this.candleSizeShorterPeriod);
  // 2 x ShorterPeriod minute candle
  this.batcherLongerPeriod = new CandleBatcher(this.candleSizeLongerPeriod);

  // supply callbacks for ShorterPeriod and LongerPeriod minute candle functions
  this.batcherShorterPeriod.on('candle', this.updateShorterPeriod);
  this.batcherLongerPeriod.on('candle', this.updateLongerPeriod);

  // gekko will be running on 1 minute timeline internally
  // so we create and maintain indicators manually in order to update them at correct time
  // rather than using this.addIndicator

  //this.cci720 = new CCI(this.settings.cci);
  // this.lastResultShorterPeriod = -1;
  //this.cci1440 = new CCI(this.settings.cci);
  // this.lastResultLongerPeriod = -1;

  this.smaLong720 = new SMA(this.settings.smaLong.parameters.optInTimePeriod);
  this.smaLong1440 = new SMA(this.settings.smaLong.parameters.optInTimePeriod);
  //TODO add tulip Indicators
  //this.tulipIndicatorsTF = [];
  //this.addTulipIndicatorTF('mycci', 'cci', helper.prepareForTulip( this.settings.cci.parameters));
  // set some initial state
  this.hodling = false;
}

/////////////////////////////////////////////////////////////////////
strat.update = function(candle) {
  // reset the buy/sell flags before updating
  this.shouldBuy = false;
  this.shouldSell = false;

  // do 1 minute processing
  this.lastPrice = candle.close;

  // update stop and take profit, if applicable
  // if (this.hodling) {
  //     if (candle.close < this.stop) {
  //       log.debug('Stop loss triggered - stop loss is ' + this.stop + ', last closing price was ' + candle.close);
  //       this.shouldSell = true;
  //     }
  //     else if (candle.close > this.takeProfit) {
  //       log.debug('Taking profit!');
  //       this.shouldSell = true;
  //     }
  // }

  // write 1 minute candle to ShorterPeriod minute batcher
  this.batcherLongerPeriod.write([candle]);
  this.batcherShorterPeriod.write([candle]);
}

/////////////////////////////////////////////////////////////////////
strat.updateShorterPeriod = function(candle) {

  this.smaLong720.update(candle.close);

  // we sell on bearish crossover of high divergence threshold on ShorterPeriod minute MACD
  // in the unlikely event that stop loss/take profit didn't trigger
  var result = this.smaLong720.result;
  log.debug(candle.start.format('YYYY-MM-DD HH:mm') +' SMA Long '+ this.candleSizeShorterPeriod +' ' + result.toFixed(2));
  // var cross = this.settings.highCross;
  // if (this.lastResultShorterPeriod != -1 && this.hodling && result < cross && this.lastResultShorterPeriod >= cross) {
  //     log.debug('Bearish crossover detected on ShorterPeriod minute MACD');
  //     this.shouldSell = true;
  // }
  this.lastResultShorterPeriod = result;

  // write ShorterPeriod minute candle to LongerPeriod minute batcher
  // this.batcherLongerPeriod.write([candle]);
}

/////////////////////////////////////////////////////////////////////
strat.updateLongerPeriod = function(candle) {
  // do LongerPeriod minute processing
  this.smaLong1440.update(candle.close);

  // we buy on bullish crossover of low divergence threshold on LongerPeriod minute MACD
  var result = this.smaLong1440.result;
  log.debug(candle.start.format('YYYY-MM-DD HH:mm') +'SMA Long '+ this.candleSizeLongerPeriod +' ' + result.toFixed(2));
  // var cross = this.settings.lowCross;
  // if (this.lastResultLongerPeriod != -1 && !this.hodling && result >= cross && this.lastResultLongerPeriod < cross) {
  //     log.debug('Bullish crossover detected on LongerPeriod minute MACD');
  //     this.shouldBuy = true;
  // }
  this.lastResultLongerPeriod = result;
}

//////////////////////////////////////////////////////////////////////
strat.check = function() {

    // check for flags set in update functions, and buy/sell accordingly
    if (!this.hodling && this.shouldBuy) {
        // buy!
        log.debug('Buying at ' + this.lastPrice);
        this.advice('long');
        this.hodling = true;
        // setup stop loss and take profit prices
        var stopDistance = this.lastPrice * this.settings.stopBuffer;
        this.stop = this.lastPrice - stopDistance;
        this.takeProfit = this.lastPrice + stopDistance * this.settings.profitRatio;
        log.debug('Setting stop=' + this.stop + ' and takeProfit=' + this.takeProfit);
    }
    else if (this.hodling && this.shouldSell) {
        // sell!
        log.debug('Selling at ' + this.lastPrice);
        this.advice('short');
        this.hodling = false;
    }
}

module.exports = strat;
