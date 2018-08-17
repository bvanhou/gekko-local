/*jshint esversion: 6 */

// helpers
var _ = require('lodash');
var log = require('../core/log.js');
var helper = require('../plugins/strategieshelper.js');

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function () {
  this.requiredHistory = this.tradingAdvisor.historySize;

  this.hasBoughtBull = false;
  this.hasBoughtBear = false;
  this.bearMarket = false;
  this.prevValues = [];
  this.breakSmaProcent = 5;

  // always calculate daily sma 
  // 24h =  1440; 1440/240 = 6
  let factor = 1440 / this.tradingAdvisor.candleSize;

  this.crossedStochPersistent = 0;
  this.shortCrossSma20Persistent = 0;
  this.prevCandle = {};

  // define the indicators we need
  this.addIndicator('smaShort20', 'SMA', this.settings.smaShort20.parameters.optInTimePeriod * factor);
  this.addIndicator('smaLong200', 'SMA', this.settings.smaLong200.parameters.optInTimePeriod * factor);
  // this.addIndicator('smaMiddle80', 'SMA', this.settings.smaMiddle80.parameters.optInTimePeriod*factor);
  // this.addIndicator('smaMiddle60', 'SMA', this.settings.smaMiddle60.parameters.optInTimePeriod*factor);
  // this.addIndicator('smaMiddle40', 'SMA', this.settings.smaMiddle40.parameters.optInTimePeriod*factor);

  this.addIndicator('stc', 'STC', this.settings.stc.parameters);
  this.addIndicator('roc', 'ROC', this.settings.roc.parameters.optInTimePeriod);
  this.addTulipIndicator('stochasticTulip', 'stoch', this.settings.stochasticTulip.parameters);
};

// what happens on every new candle?
method.update = function (candle) {

}

// for debugging purposes: log the last calculated
// EMAs and diff.
method.log = function (candle) {
}

method.check = function (candle) {
  this.stc = this.indicators.stc.result;
  this.stochasticTulip = this.tulipIndicators.stochasticTulip.result; //'stochK', 'stochD'
  this.roc = this.indicators.roc.result;
  this.smaShort20 = this.indicators.smaShort20.result;
  this.smaLong200 = this.indicators.smaLong200.result;

  let currentValue = {};
  currentValue.candle = candle;

  let indicatorNames = Object.keys(this.indicators);
  indicatorNames.forEach((name) => currentValue[name] = this.indicators[name].result);

  indicatorNames = Object.keys(this.tulipIndicators);
  indicatorNames.forEach((name) => currentValue[name] = this.tulipIndicators[name].result.result);

  this.prevValue = this.prevValues[this.prevValues.length-1];
  this.currentValue = currentValue;

  this.prevValues.push(currentValue);
  
  if (this.prevValues.length > 10) {
    this.prevValues.shift();
  }

  //stochastic cross at down thresholds
  if (!this.hasBoughtBull
    // && this.prevsmaMiddle40 < this.smaMiddle40 // 1. ema/sma should rise
    // 2. Stochastics crossed at oversold levels in the past 10 days!
    && helper.crossLong(this.prevStochK, this.prevStochD, this.stochasticTulip.stochK, this.stochasticTulip.stochD)
    && this.stochasticTulip.stochK <= this.settings.stochasticTulip.thresholds.buy.strong_down
    && this.stochasticTulip.stochD <= this.settings.stochasticTulip.thresholds.buy.strong_down
  ) {
    this.crossedStochPersistentBull = 1;
  }

  if (!this.hasBoughtBear 
    // 2. Stochastics crossed at overbought levels in the past 10 days!
    && helper.crossShort(this.prevStochK, this.prevStochD, this.stochasticTulip.stochK, this.stochasticTulip.stochD)
    && this.stochasticTulip.stochK >= this.settings.stochasticTulip.thresholds.up
    && this.stochasticTulip.stochD >= this.settings.stochasticTulip.thresholds.up
  ) {
    this.crossedStochPersistentBear = 1;
  }

  // breakSmaWithMomentum(2, candle, this.prevCandle, this.prevsmaShort20, this.smaShort20, this.roc);

  // Break through the BB-Middle (SMA 20) with high momentum within 3 days
  // const shortCrossBB = helper.crossShort(this.prevCandle.close,this.prevsmaShort20, candle.close, this.smaShort20);
  // if (shortCrossBB){
  //   this.shortCrossSma20Persistent = 1;
  // }

  this.breakSma = 0;
  if ((!this.bearMarket && this.hasBoughtBull) || (this.bearMarket && this.hasBoughtBear)) {
    const smaDaily = this.smaShort20;
    if (breakSmaFn(this.breakSmaProcent, currentValue.candle, smaDaily, this.bearMarket,
       !this.bearMarket && this.prevValues.slice(-10).some((prevValue)=>prevValue.candle.close > smaDaily)
       || 
       this.bearMarket && this.prevValues.slice(-10).some((prevValue)=>prevValue.candle.close < smaDaily)
      )) {
      this.breakSma = true;
    }
  }

  this.bearMarket = candle.close < this.smaLong200 ? true: false;

  //check if crosses are too old
  this.crossedStochPersistentBull = isCrossOld(this.crossedStochPersistentBull, this.settings.stochasticTulip.thresholds.cross_in_last_days);
  this.crossedStochPersistentBear = isCrossOld(this.crossedStochPersistentBear, this.settings.stochasticTulip.thresholds.cross_in_last_days);
  // this.shortCrossSma20Persistent = isCrossOld(this.shortCrossSma20Persistent, this.settings.smaShort20.thresholds.cross_in_last_days);

  //log.debug (candle.start.format('YYYY-MM-DD HH:mm') + ' stc: '+this.stc.toFixed(2) + ' '   + ' BBPersistent:'+this.shortCrossSma20Persistent + ' StochPersistent: '+this.crossedStochPersistent+ ' roc: '+(this.roc? this.roc.toFixed(2):'') );

  // isTrend: isTrend
  let buyadviceProp = {
    crossedStochPersistentBull: this.crossedStochPersistentBull,
    crossedStochPersistentBear: this.crossedStochPersistentBear,
    stc: this.stc,
    prevStc: this.prevStc, 
    stc_thresholds_up: this.settings.stc.thresholds.up,
    stc_thresholds_down: this.settings.stc.thresholds.down,
    bearMarket: this.bearMarket
  };
  let selladviceProp = {
    breakSma: this.breakSma,
    roc: this.roc, roc_thresholds_down: this.settings.roc.thresholds.down,
    bearMarket: this.bearMarket
  };

  // buy bull trend
  if (this.hasBoughtBull || !this.bearMarket) {
    this.bullTrendStrat(candle, buyadviceProp, selladviceProp);
  }
  // buy bear trend
  if (this.hasBoughtBear || this.bearMarket){
    this.bearTrendStrat(candle, buyadviceProp, selladviceProp);
  }

  //this.prevsmaLong200 = this.smaLong200;
  this.prevsmaShort20 = this.smaShort20;
  this.prevStc = this.stc;
  this.prevCci = this.cci;
  this.prevStochK = this.stochasticTulip.stochK;
  this.prevStochD = this.stochasticTulip.stochD;
  this.prevCandle = candle;
};

method.bullTrendStrat = function (candle, buyadviceProp, selladviceProp) {
  if (!this.hasBoughtBull &&
    ( buyadviceProp.crossedStochPersistentBull > 0 &&      // 2. Stochastics crossed at oversold levels in the past x days!
      buyadviceProp.stc >= buyadviceProp.stc_thresholds_down &&// 3. STC left oversold level and is above +10 or thresholds.up
      buyadviceProp.prevStc <= buyadviceProp.stc_thresholds_down // 
      && candle.close > this.smaShort20 
      // || this.roc <= this.settings.momentum.thresholds.buy.down
    )
  ) {
    this.hasBoughtBull = true;
    this.advice('long', candle, buyadviceProp);
    this.crossedStochPersistentBull = 0;
    this.prevValues = this.prevValues.slice(-1);
    this.stop = this.prevCandle.open < this.candle.close ? Math.min(this.prevCandle.open, this.candle.open * 0.9) : this.candle.close*0.9;   // stoploss max 10%
    //this.stop = this.candle.close * 0.9;   // stoploss max 10%
  } else if (this.hasBoughtBull &&
    (selladviceProp.breakSma  
      // && selladviceProp.roc <= selladviceProp.roc_thresholds_down
      || (candle.close < this.stop)
    )
  ) {
    this.hasBoughtBull = false;
    this.advice('short', candle, selladviceProp);
    this.crossedStochPersistentBull = 0;
  }
};

method.bearTrendStrat = function (candle, buyadviceProp, selladviceProp) {
  if (!this.hasBoughtBear &&
    (buyadviceProp.crossedStochPersistentBear > 0 &&      // 2. Stochastics crossed at overbought levels in the past x days!
      buyadviceProp.stc <= buyadviceProp.stc_thresholds_up &&// 3. STC left overbought level and is above +10 or thresholds.up
      buyadviceProp.prevStc <= buyadviceProp.stc_thresholds_up // 
      && candle.close < this.smaShort20 
    )
  ) {
    this.hasBoughtBear = true;
    this.advice('short bear', candle, buyadviceProp);
    this.crossedStochPersistentBear = 0;
    this.shortCrossSma20Persistent = 0;
    this.prevValues = this.prevValues.slice(-1);
    //this.stop = this.prevCandle.open < this.candle.close ? Math.min(this.prevCandle.open, this.candle.open * 0.9) : this.candle.close;   // stoploss max 10%
    this.stop = this.candle.close * 1.1;   // stoploss max 10%
  } else if (this.hasBoughtBear &&
    (selladviceProp.breakSma  
      // && selladviceProp.roc <= selladviceProp.roc_thresholds_down
      || (candle.close > this.stop)
    )
  ) {
    this.hasBoughtBear = false;
    this.advice('long bear', candle, selladviceProp);

    this.crossedStochPersistentBear = 0;
    this.shortCrossSma20Persistent = 0;
  }
};

function isCrossOld(cross, maxAge) {
  if (cross > 0 && cross < maxAge) {
    cross++;
  } else {
    cross = 0; // cross is too old, reset.
  }

  return cross;
}

function breakSmaFn (procent, candle, sma, bearMarket, shouldCheck){
  let breakSma = false;
  if (!shouldCheck)  return false;
  
  //if (bearMarket) console.log('bearMarket breakSMA shouldCheck');
  if ((!bearMarket && candle.close * (1+(procent+0)*0.01) < sma) || (bearMarket && candle.close * (1-(procent+0)*0.01) > sma)){ 
    breakSma = true;
    //if (bearMarket) console.log('bearMarket breakSMA');
  }

  return breakSma;
}
module.exports = method;
