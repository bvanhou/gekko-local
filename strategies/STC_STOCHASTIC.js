// helpers
var _ = require('lodash');
var log = require('../core/log.js');
var helper = require('../plugins/strategieshelper.js');
var Math = require('mathjs');
var CCI = require('./indicators/CCI.js');

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function() {
  this.currentTrend;
  this.requiredHistory = this.tradingAdvisor.historySize;

  this.age = 0;
  this.trend = {
    direction: 'undefined',
    duration: 0,
    persisted: false,
    adviced: false
  };

  this.hasBought = false;
  this.crossedStochPersistent = 0;
  this.shortCrossBBPersistent = 0;
  this.prevCandle = {};

  // define the indicators we need
  this.addIndicator('stc', 'STC_Rob', this.settings.stc);

  this.addTulipIndicator('stochasticTulip', 'stoch', this.settings.stochasticTulip.parameters);
  this.addTulipIndicator('bbands', 'bbands', this.settings.bbands.parameters);

  this.addIndicator('smaLong200',   'SMA', this.settings.smaLong200.parameters.optInTimePeriod);
  this.addIndicator('smaMiddle80', 'SMA', this.settings.smaMiddle80.parameters.optInTimePeriod);
  this.addIndicator('smaMiddle60', 'SMA', this.settings.smaMiddle60.parameters.optInTimePeriod);
  this.addIndicator('smaMiddle40', 'SMA', this.settings.smaMiddle40.parameters.optInTimePeriod);
  //this.addIndicator('smaShort20',  'SMA', this.settings.smaShort20.parameters.optInTimePeriod);
  this.addIndicator('roc',  'ROC', this.settings.roc.parameters.optInTimePeriod);

  //this.addIndicator('cci',   'CCI', this.settings.cci.parameters);
}

// what happens on every new candle?
method.update = function(candle) {

}

// for debugging purposes: log the last calculated
// EMAs and diff.
method.log = function(candle) {
}

method.check = function(candle) {
  this.stc = this.indicators.stc.result;
  this.stochasticTulip = this.tulipIndicators.stochasticTulip.result; //'stochK', 'stochD'
  this.roc = this.indicators.roc.result;

  this.smaLong200 = this.indicators.smaLong200.result;
  this.smaMiddle40 = this.indicators.smaMiddle40.result;
  this.smaMiddle60 = this.indicators.smaMiddle60.result;
  this.smaMiddle80 = this.indicators.smaMiddle80.result;
  this.smaShort20 = this.tulipIndicators.bbands.result.middleBand;

  if (this.crossedStochPersistent > 0 && this.crossedStochPersistent < this.settings.stochasticTulip.thresholds.cross_in_last_days){
    this.crossedStochPersistent++;
  }else{
    this.crossedStochPersistent = 0; // cross is too old:
  }

  if (this.crossedShortPersistent>0 && this.crossedShortPersistent < this.settings.stochasticTulip.thresholds.cross_in_last_days){
    this.crossedShortPersistent++;
  }else
    this.crossedShortPersistent = 0; // cross is too old:

  if (this.shortCrossBBPersistent>0 && this.shortCrossBBPersistent <=this.settings.roc.thresholds.cross_in_last_days){
    this.shortCrossBBPersistent++;
  }else
    this.shortCrossBBPersistent = 0; // cross is too old:

  const crossed = helper.crossLong(this.prevStochK,this.prevStochD, this.stochasticTulip.stochK, this.stochasticTulip.stochD)
  if (!this.hasBought
    // && this.prevsmaMiddle40 < this.smaMiddle40 // 1. ema/sma should rise
    && crossed // 2. Stochastics crossed at oversold levels in the past 10 days!
    && this.stochasticTulip.stochK <= this.settings.stochasticTulip.thresholds.buy.strong_down
    && this.stochasticTulip.stochD <= this.settings.stochasticTulip.thresholds.buy.strong_down
  ){
    this.crossedStochPersistent = 1;
    //log.debug ('crossedStochPersistent: !' + ' '+this.crossedStochPersistent)
  }


  const shortCross = helper.crossShort(this.prevStochK,this.prevStochD, this.stochasticTulip.stochK, this.stochasticTulip.stochD)
  if (//this.hasBought
    shortCross
    && this.stochasticTulip.stochK >= this.settings.stochasticTulip.thresholds.buy.weak_down
    //&& this.stc < this.prevStc
  ){
    this.crossedShortPersistent = 1;
  //  this.crossedStochPersistent = 0; //cancel when in the middle cross  stc changed direction
  //  log.debug ('crossedShortPersistent CANCEL!' + ' '+this.crossedShortPersistent)
  }

  // const shortCrossWithSTC = this.crossedShortPersistent > 0 && this.crossedShortPersistent < 5
  //                           && this.stc <= this.settings.stc.thresholds.down

  // Break through the BB-Middle (SMA 20) with high momentum within 3 days
  const shortCrossBB = helper.crossShort(this.prevCandle.close,this.prevsmaShort20, candle.close, this.smaShort20)
  if (shortCrossBB){
    this.shortCrossBBPersistent = 1;
    //log.debug ('shortCrossBBPersistent: ' + ' '+this.shortCrossBBPersistent)
  }

  const cutMiddleWithMomentum = (this.shortCrossBBPersistent > 0 && this.shortCrossBBPersistent <= this.settings.roc.thresholds.cross_in_last_days
                            && (this.roc <= this.settings.roc.thresholds.down))

  log.debug (candle.start.format('YYYY-MM-DD HH:mm') + ' stc: '+this.stc.toFixed(2) + ' '   + ' BBPersistent:'+this.shortCrossBBPersistent + ' StochPersistent: '+this.crossedStochPersistent+ ' roc: '+(this.roc? this.roc.toFixed(2):'') );
  //log.debug('\t'+(this.prevStochK? this.prevStochK.toFixed(2):'')+' '+(this.prevStochD? this.prevStochD.toFixed(2):' ')+ ' '+ this.stochasticTulip.stochK.toFixed(2)+ ' '+ this.stochasticTulip.stochD.toFixed(2));

  if (!this.hasBought
    //&& this.prevsmaLong200 < this.smaLong200 // 1. ema/sma should rise
    && (this.crossedStochPersistent >0 && this.crossedStochPersistent <= this.settings.stochasticTulip.thresholds.cross_in_last_days// 2. Stochastics crossed at oversold levels in the past x days!
    && this.stc >= this.settings.stc.thresholds.down // 3. STC left oversold level and is above +10 or thresholds.up
    && this.prevStc <= this.settings.stc.thresholds.down // or < this.stc
  //  && candle.close > this.smaMiddle80 // avoid false singals, but this lowers performance
  // || this.roc <= this.settings.momentum.thresholds.buy.down
  )
  ){
    this.hasBought = true;
    this.advice('long');
    this.crossedStochPersistent = 0;
    this.shortCrossBBPersistent = 0;
    this.stop = this.prevCandle.open < this.candle.close ? Math.min(this.prevCandle.open, this.candle.open *0.9) : this.candle.close   // stoploss max 10%
  }else if (this.hasBought
    && (cutMiddleWithMomentum
    //&& this.stochasticTulip.stochK <= this.settings.stochasticTulip.thresholds.up
    //&& this.stochasticTulip.stochD <= this.settings.stochasticTulip.thresholds.up //too late! cci is faster
    //&& this.prevStochK >= this.settings.stochasticTulip.thresholds.up
    //&& this.prevStochD >= this.settings.stochasticTulip.thresholds.up
    //&& candle.close < this.smaLong200
    //&& this.cci < this.settings.cci.thresholds.down
    //&& this.prevCci > this.cci
    //&& this.crossedShortPersistent>0
    //&& this.stc <= this.settings.stc.thresholds.up
    //&& this.prevStc >= this.settings.stc.thresholds.up
    || (candle.close < this.stop && this.roc > this.settings.roc.thresholds.buy.down)
  //  || (candle.close < this.smaMiddle40 && candle.close < this.smaMiddle60 && this.roc > this.settings.momentum.thresholds.buy.down) // sell if both lines hit, but this lowers performance
    )
  ){
    this.hasBought = false;
    this.advice('short');
    this.crossedStochPersistent = 0;
    this.shortCrossBBPersistent = 0;
  }


  //this.prevsmaLong200 = this.smaLong200;
  this.prevsmaShort20 = this.smaShort20;
  this.prevStc = this.stc;
  this.prevCci = this.cci;
  this.prevsmaMiddle40 = this.smaMiddle40;
  this.prevStochK = this.stochasticTulip.stochK;
  this.prevStochD = this.stochasticTulip.stochD;
  this.prevCandle = candle;

}
module.exports = method;
