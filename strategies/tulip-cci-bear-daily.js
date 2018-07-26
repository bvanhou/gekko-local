var log = require('../core/log.js');
// Let's create our own method
var method = {};

// Prepare everything our method needs
method.init = function() {
  this.name = 'tulip-cci-bear-daily'
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

  // define the indicators we need
  this.addTulipIndicator('mycci', 'cci', prepareForTulip(this.settings.cci.parameters));
  this.addTulipIndicator('smaLong', 'sma', prepareForTulip(this.settings.smaLong.parameters));
  this.addTulipIndicator('smaMiddle', 'sma', prepareForTulip(this.settings.smaMiddle.parameters));
}

// What happens on every new candle?
method.update = function(candle) {
   this.cci = this.tulipIndicators.mycci.result.result;
   this.smaLong = this.tulipIndicators.smaLong.result.result;
   this.smaMiddle = this.tulipIndicators.smaMiddle.result.result;
}


method.log = function(candle) {
  log.debug (candle.start.format('YYYY-MM-DD HH:mm')+ ' cci: '+this.cci + '\tup: '+this.settings.cci.thresholds.up + '\tdown: '+this.settings.cci.thresholds.down);
}

// Based on the newly calculated
// information, check if we should
// update or not.
method.check = function(candle) {

  if(!this.hasBought
    && this.cci < this.settings.cci.thresholds.down //strong buy bear
    && this.smaMiddle < this.smaLong // and we have bear Trend
    ){
    this.hasBought = true;
    this.advice('short bear');
  }else  if(this.settings.cci.thresholds.up < this.cci && this.hasBought) { //strong sell bear
    this.hasBought = false;
    this.advice('long bear');
  }
}

function prepareForTulip(customSettings){
  customSettings.optInTimePeriod =  Number(customSettings.optInTimePeriod);
  return customSettings;
}
module.exports = method;
