/*jshint esversion: 6 */

var log = require('../core/log.js');
var helper = require('../plugins/strategieshelper.js');

// Let's create our own method
var method = {};

// Prepare everything our method needs
method.init = function() {
  this.name = 'tulip-cci-bear-daily';

  this.hasBoughtBull = false;
  this.hasBoughtBear = false;

  this.cci = undefined;
  // how many candles do we need as a base
  // before we can start giving advice?
  this.requiredHistory = this.tradingAdvisor.historySize;

  // define the indicators we need
  this.addIndicator('ccibear', 'CCI', this.settings.ccibear.parameters.optInTimePeriod);
  this.addIndicator('ccibull', 'CCI', this.settings.ccibull.parameters.optInTimePeriod);

  this.addIndicator('smaLong', 'SMA', this.settings.smaLong.parameters.optInTimePeriod);
  this.addIndicator('smaMiddle', 'SMA', this.settings.smaMiddle.parameters.optInTimePeriod);
};

// What happens on every new candle?
method.update = function(candle) {
   this.ccibear = this.indicators.ccibear.result;
   this.ccibull = this.indicators.ccibull.result;

   this.smaLong = this.indicators.smaLong.result;
   this.smaMiddle = this.indicators.smaMiddle.result;
};


method.log = function(candle) {
};

// Based on the newly calculated
// information, check if we should
// update or not.
method.check = function(candle) {

  this.bearMarket=  this.smaMiddle < this.smaLong ? true : false;

  // if (this.cci) {
  //   log.debug (candle.start.format('YYYY-MM-DD HH:mm')+ ' cci: '+this.cci.toFixed(2));
  // }

  // buy bull trend
  if (this.hasBoughtBull || !this.bearMarket){
    this.bullTrendStrat(candle);
  }
  // buy bear trend
  if (this.hasBoughtBear || this.bearMarket){
    this.bearTrendStrat(candle);
  }
};

method.bullTrendStrat = function(candle){
  if(!this.hasBoughtBull && this.settings.ccibull.thresholds.up < this.ccibull){ //strong long
    this.hasBoughtBull = true;
    this.advice('long', candle, {ccibull: this.ccibull});
  }else if(this.hasBoughtBull && this.settings.ccibull.thresholds.down > this.ccibull) { //strong short
    this.hasBoughtBull = false;
    this.advice('short', candle, {ccibull: this.ccibull});
  }
};

method.bearTrendStrat = function(candle){
  if(!this.hasBoughtBear
    && this.ccibear < this.settings.ccibear.thresholds.down //strong buy bear
    ){
    this.hasBoughtBear = true;
    this.advice('short bear', candle, {ccibear: this.ccibear});
  }else  if(this.settings.ccibear.thresholds.up < this.ccibear && this.hasBoughtBear) { //strong sell bear
    this.hasBoughtBear = false;
    this.advice('long bear', candle, {ccibear: this.ccibear});
  }
};

module.exports = method;
