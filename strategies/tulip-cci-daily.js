var log = require('../core/log.js');
// Let's create our own method
var method = {};

// Prepare everything our method needs
method.init = function() {
  this.name = 'tulip-cci-daily'
  // keep state about the current trend
  // here, on every new candle we use this
  // state object to check if we need to
  // report it.
  this.trend = 'none';

  this.hasBought = false;
  this.cci = undefined;
  // how many candles do we need as a base
  // before we can start giving advice?
  this.requiredHistory = this.tradingAdvisor.historySize;

  var customSettings = this.settings.cci.parameters;
  customSettings.optInTimePeriod =  Number(customSettings.optInTimePeriod);

  // define the indicators we need
  this.addTulipIndicator('mycci', 'cci', customSettings);
}

// What happens on every new candle?
method.update = function(candle) {
   const cci = this.tulipIndicators.mycci.result.result;
   if (cci){
     this.cci = cci.toFixed(2);
   }
}


method.log = function(candle) {
  log.debug (candle.start.format('YYYY-MM-DD HH:mm')+ ' cci: '+this.cci + '\tup: '+this.settings.cci.thresholds.up + '\tdown: '+this.settings.cci.thresholds.down);
}

// Based on the newly calculated
// information, check if we should
// update or not.
method.check = function(candle) {

  if(this.settings.cci.thresholds.up < this.cci && !this.hasBought){ //strong long
    this.hasBought = true;
    this.advice('long');
  }else  if(this.settings.cci.thresholds.down > this.cci && this.hasBought) { //strong short
    this.hasBought = false;
    this.advice('short');
  }
}

module.exports = method;
