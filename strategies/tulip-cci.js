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

  // how many candles do we need as a base
  // before we can start giving advice?
  this.requiredHistory = this.tradingAdvisor.historySize;

  var customSettings = this.settings.parameters;
  customSettings.optInTimePeriod =  Number(customSettings.optInTimePeriod);

  // define the indicators we need
  this.addTulipIndicator('mycci', 'cci', customSettings);
}

// What happens on every new candle?
method.update = function(candle) {
  // nothing!
}


method.log = function() {
  var result = this.tulipIndicators.mycci.result;
  // nothing!

}

// Based on the newly calculated
// information, check if we should
// update or not.
method.check = function(candle) {
  var price = candle.close;
  var result = this.tulipIndicators.mycci.result;
  var cci = result['result']

  //log.debug(cci);

  if(this.settings.thresholds.down > cci) { //strong short
    this.trend = 'short';
    this.advice('short');

  } else if(this.settings.thresholds.up < cci){ //strong long
    this.trend = 'long';
    this.advice('long');

  }
}

module.exports = method;
