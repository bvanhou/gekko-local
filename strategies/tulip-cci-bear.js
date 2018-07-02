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
  this.name = 'tulip-cci-bear'
  // keep state about the current trend
  // here, on every new candle we use this
  // state object to check if we need to
  // report it.
  this.trend = 'none';
  this.hasBought = false;
  this.hasBoughtWithRsiHighLong = false;

  // how many candles do we need as a base
  // before we can start giving advice?
  this.requiredHistory = this.tradingAdvisor.historySize;
  this.prevRsiQueue = [] //last 10 rsi
  this.prevCciQueue = [] //last 10 rsi
  this.maxRsiQueueSize = 10;

  var customCciSettings = this.settings.cci.parameters;
  customCciSettings.optInTimePeriod =  Number(customCciSettings.optInTimePeriod);
  var customRsiSettings = this.settings.rsi.parameters;
  customRsiSettings.optInTimePeriod =  Number(customRsiSettings.optInTimePeriod);

  var customCciFilterSettings = this.settings.cciFilter.parameters;
  customCciFilterSettings.optInTimePeriod =  Number(customCciFilterSettings.optInTimePeriod);


  // define the indicators we need
  this.addTulipIndicator('mycci', 'cci', customCciSettings);
  this.addTulipIndicator('ccifilter', 'cci', customCciFilterSettings);
  // trend filter!
  this.addTulipIndicator('myrsi', 'rsi', customRsiSettings);
}

// What happens on every new candle?
method.update = function(candle) {
  // nothing!
  this.prevRsiQueue.push (this.tulipIndicators.myrsi.result.result);
  if (this.maxRsiQueueSize < this.prevRsiQueue.length){
    this.prevRsiQueue.shift(); // drop first element in Queue
  }

  //log.debug(this.prevRsiQueue);
  this.prevCciQueue.push (this.tulipIndicators.ccifilter.result.result);
  if (this.maxRsiQueueSize < this.prevCciQueue.length){
    this.prevCciQueue.shift(); // drop first element in Queue
  }
}


method.log = function() {
  // nothing!

}

// Based on the newly calculated
// information, check if we should
// update or not.
method.check = function(candle) {
  const price = candle.close;
  const result = this.tulipIndicators.mycci.result;
  const rsiResult = this.tulipIndicators.myrsi.result;
  const cciFilter = this.tulipIndicators.ccifilter.result.result;
  const cci = result['result']
  const rsi = rsiResult['result']

  let rsiIsSmaller = false;
  for (let rsiTemp of this.prevRsiQueue) {
    //console.log(rsiTemp);
    if (!this.hasBought && rsi < rsiTemp && rsi < this.settings.rsi.thresholds.up && rsiTemp> this.settings.rsi.thresholds.up){
      rsiIsSmaller = true;
      break;
    }
  }

  let cciIsSmaller = false;
  for (let cciTemp of this.prevCciQueue) {
    //console.log(rsiTemp);
    if (!this.hasBought && cciFilter < cciTemp && cciFilter < this.settings.cciFilter.thresholds.up && cciTemp> this.settings.cciFilter.thresholds.up){
      cciIsSmaller = true;
      break;
    }
  }

  const cross_cci_high_long = [
      cciIsSmaller,
      cciFilter < this.settings.cciFilter.thresholds.up && !this.hasBought,
      cciFilter > this.settings.cciFilter.thresholds.down && !this.hasBought,
      cci < this.settings.cci.thresholds.down && !this.hasBought,
  ].reduce((total, long)=>long && total, true);


  const cross_rsi_high_long = [
      rsiIsSmaller,
      rsi < this.settings.rsi.thresholds.up && !this.hasBought,
      rsi > this.settings.rsi.thresholds.down && !this.hasBought,
      cci < this.settings.cci.thresholds.down && !this.hasBought,
  ].reduce((total, long)=>long && total, true);

  const cross_rsi_low_long = [
      rsi < this.settings.rsi.thresholds.down && !this.hasBought,
      cci < this.settings.cci.thresholds.down && !this.hasBought,
  ].reduce((total, long)=>long && total, true);

  const cross_cci_low_long = [
      cciFilter < this.settings.cciFilter.thresholds.down && !this.hasBought,
      cci < this.settings.cci.thresholds.down && !this.hasBought,
  ].reduce((total, long)=>long && total, true);

  const all_short =  this.settings.cci.thresholds.down < cci && this.hasBought;

  // log.debug (candle.start.format('YYYY-MM-DD HH:mm')+ ' rsi: '+rsi + ' ' + rsiIsSmaller +' '+this.settings.rsi.thresholds.up+ ' ' + this.settings.rsi.thresholds.down+ ' cci: '+cci + ' '+this.settings.cci.thresholds.down);

  if(cross_cci_high_long || cross_cci_low_long){
    //log.debug ('buy bear at: '+candle.close);
    this.hasBought = true;
    this.advice('short bear');
    this.hasBoughtWithRsiHighLong = cross_cci_high_long;
  }else if(all_short || (this.hasBoughtWithRsiHighLong && this.settings.cci.thresholds.down < cci)){
    //log.debug ('sell bear at: '+candle.close);
    this.advice('long bear');
    this.hasBought = false;
    this.hasBoughtWithRsiHighLong = false;
  }else{
    // this.advice();
  }
}

module.exports = method;
