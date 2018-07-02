// If you want to use your own trading methods you can
// write them here. For more information on everything you
// can use please refer to this document:
//
// https://github.com/askmike/gekko/blob/stable/docs/trading_methods.md
var log = require('../core/log.js');
// Let's create our own method
var method = {};

// Prepare everything our method needs
method.init = function() {
  this.name = 'tulip-cci'
  // keep state about the current trend
  // here, on every new candle we use this
  // state object to check if we need to
  // report it.
  this.trend = 'none';
  this.hasBought = false;
  this.prevCci = 0;

  // how many candles do we need as a base
  // before we can start giving advice?
  this.requiredHistory = this.tradingAdvisor.historySize;

  var customSettings = this.settings.cci.parameters;
  customSettings.optInTimePeriod =  Number(customSettings.optInTimePeriod);

  var customAdxSettings = this.settings.adx.parameters;
  customAdxSettings.optInTimePeriod =  Number(customAdxSettings.optInTimePeriod);

  var customAroonSettings = this.settings.aroonosc.parameters;
  customAroonSettings.optInTimePeriod =  Number(customAroonSettings.optInTimePeriod);

  // define the indicators we need
  this.addTulipIndicator('myadx', 'adx', customAdxSettings);
  this.addTulipIndicator('mycci', 'cci', customSettings);
  this.addTulipIndicator('myaroonosc', 'aroonosc', customAroonSettings);
}

// What happens on every new candle?
method.update = function(candle) {
  // nothing!
}


method.log = function() {
  // nothing!
}

// Based on the newly calculated
// information, check if we should
// update or not.
method.check = function(candle) {
  const price = candle.close;
  const cci = this.tulipIndicators.mycci.result.result;
  const adx = this.tulipIndicators.myadx.result.result;
  const aroonosc = this.tulipIndicators.myaroonosc.result.result;

  log.debug('aroonosc: ' + aroonosc +' adx: '+adx+  ' ' +this.settings.adx.thresholds.up + ' cci '+cci + ' ' +this.settings.cci.thresholds.up);

  if(this.settings.cci.thresholds.up < cci && !this.hasBought
      && adx > this.settings.adx.thresholds.up
      && cci < this.settings.cci.thresholds.up_extreme
      && aroonosc > this.settings.aroonosc.thresholds.up
      ){ //strong long but not extreme!
      this.hasBought = true;
      this.advice('long');
    }else if(this.settings.cci.thresholds.down > cci && this.hasBought) { //strong short
      this.hasBought = false;
      this.advice('short');
  }
  this.prevCci = cci;
}

module.exports = method;
