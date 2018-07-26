// helpers
var _ = require('lodash');
var log = require('../core/log.js');
var moment = require('moment');
const CandleBatcher = require('../core/candleBatcher');

var helper = require('../plugins/strategieshelper.js');
var Math = require('mathjs');
var CCI = require('./indicators/CCI.js');

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function() {
  this.currentTrend;
  this.requiredHistory = this.tradingAdvisor.historySize;

  this.candleSizeLongerPeriod = 6 // 6*240= 1440;
  this.near = 8;

  this.cycle = 10;
  this.buyingAge = 0;

  this.trend = {
    direction: 'undefined',
    duration: 0,
    persisted: false,
    adviced: false
  };

  this.hasBought = false;
  this.prevValues = [];

  // define the indicators we need
  this.addIndicator('adx',   'ADX', this.settings.adx.parameters.ADXLength );
  //this.addIndicator('cci',   'CCI', this.settings.cci.parameters);
  //this.addIndicator('rsi',   'RSI', this.settings.rsi.parameters);
  //this.addIndicator('roc',   'ROC', this.settings.roc.parameters.optInTimePeriod);
  this.addIndicator('stc',   'STC_Rob', this.settings.stc.parameters);
  this.addIndicator('stcDaily',   'STC_Rob', this.settings.stcDaily.parameters, this.candleSizeLongerPeriod);

  //this.addTulipIndicator('bbands', 'bbands', this.settings.bbands.parameters);
  this.addTulipIndicator('aroonosc', 'aroonosc', this.settings.aroonosc.parameters);

  this.addIndicator('smaMiddle20', 'SMA', this.settings.smaMiddle20.parameters.optInTimePeriod);

  // always calculate daily sma 
  // 24h =  1440; 1440/240 = 6
  let factor = 1440 / this.tradingAdvisor.candleSize;
  
  this.smaDailies = [20,60,100,140,180,220];
  this.smaDailies.forEach(v => {
    this.addIndicator('smaMiddle'+v+'daily', 'SMA', v*factor);
  })
}

// what happens on every new candle?
method.update = function(candle) {
}

// for debugging purposes: log the last calculated
method.log = function(candle) {
}

method.methodUpdateLongerPeriod = function(candle) {
}

method.check = function(candle) {
  this.smaDailies.forEach(v => this['smaMiddle'+v+'daily'] = this.indicators['smaMiddle'+v+'daily'].result);
  
  //candle: candle;
  let currentValue = {};
  currentValue.candle = candle;

  let indicatorNames = Object.keys(this.indicators);
  indicatorNames.forEach((name) => currentValue[name] = this.indicators[name].result);

  indicatorNames = Object.keys(this.tulipIndicators);
  indicatorNames.forEach((name) => currentValue[name] = this.tulipIndicators[name].result.result);

  this.prevValues.push(currentValue);

  if (this.prevValues.length > 10) {
    this.prevValues.shift();
  }


  this.buyingAge = this.buyingAge > 0? this.buyingAge+1 : 0;
  //sell when sma broken
  //1. candle close under sma
  this.breakSma = 0;
  if (this.hasBought){
    this.smaDailies.some((v)=> {
      const smaDaily = this['smaMiddle'+v+'daily'];
      if (breakSmaFn(0.1, currentValue.candle, smaDaily, this.buysma === v)){
        this.breakSma = v;
        return true;
      }
    });
  }
  
  
  
  let prevValue = this.prevValues[this.prevValues.length-2];
  log.debug (candle.start.format('YYYY-MM-DD HH:mm')
   + ' currCandle: '+candle.close.toFixed(2)
   + ' prevCandle: '+(prevValue ? prevValue.candle.close.toFixed(2) : '') 
   + ' '+this.breakSma
  );
}

// we can make hier a stoploss? 
method.candleOneMin = function(candle) {
  const isAllowedToCheck = this.requiredHistory <= this.age;
  if (!isAllowedToCheck){
    return;
  }

  let prevValue = this.prevValues[this.prevValues.length-2];
  let currentValue = this.prevValues[this.prevValues.length-1];
  
  let isTrend = currentValue.aroonosc >= 75 || currentValue.aroonosc <= -75;

  //near smaLine within x%
  let nearSma = getNearSma(candle, prevValue, this.smaDailies, this, this.near, this.hasBought);
  let resistanceSma = getResistanceSma(candle, this.smaDailies, this, this.buysma, this.hasBought);



  //sell
  let cciChangedSell = cciChangedSellFn(currentValue.cci, prevValue);
  
  //sell when we have in previous values max STC that is over thresholds.up
  let maxPrevStc =this.prevValues.length > 1 ? Math.max(this.prevValues.slice(0, -1).map(v => v.stc)) : 0;
  let stcSellSignal = (currentValue.stc <= this.settings.stc.thresholds.down && maxPrevStc >= this.settings.stc.thresholds.up);

  if (!this.hasBought && candle.start > moment("2017-07-16 10:00:00") && candle.start < moment("2017-07-16 15:00:00")){

    log.debug(candle.start.format('YYYY-MM-DD HH:mm') 
    + ' prevCandle: '+(prevValue ? prevValue.candle.close.toFixed(2) : '') 
    + ' curCandle:' +currentValue.candle.close.toFixed(2) + ' currMin:'+candle.close.toFixed(2)
    + ' sma140:' +this.smaMiddle140daily.toFixed(2)
    + ' sma180:' +this.smaMiddle180daily.toFixed(2)
    + ' nearSma: '+nearSma ) ;
  }
  

  let buyadviceProp = {nearSma : nearSma, isTrend: isTrend}  
  let selladviceProp = {breakSma: this.breakSma, resistanceSma: resistanceSma }  
  // buy bull trend
  this.bullTrendStrat(candle, buyadviceProp, selladviceProp);
  // buy range


  // buy bear trend

  //save prev
  this.prevCandleOneMin = candle; 
}

method.bullTrendStrat = function(candle, buyadviceProp, selladviceProp){

  if (!this.hasBought
    && ( buyadviceProp.nearSma > 0 )
    && buyadviceProp.isTrend
  ){
    this.hasBought = true;
    this.advice('long', candle, buyadviceProp);
    this.buyingAge = 1;
    // merken sma
    this.buysma = buyadviceProp.nearSma;
    this.breakSma = 0;
    //this.stop = this.prevCandle.open < currentValue.candle.close ? Math.min(this.prevCandle.open, currentValue.candle.open *0.9) : currentValue.candle.close   // stoploss max 10%
  }else if (this.hasBought
    && (selladviceProp.breakSma > 0 || selladviceProp.resistanceSma < 0
      ) //|| this.buyingAge >= 10
    
  ){
    this.hasBought = false;
    this.advice('short', candle, selladviceProp);
    this.buyingAge = 0;
    this.breakSma = 0;
  }
}


function getResistanceSma(candle, smaDailies, indicators, buysma, hasBought) {
  let resistanceSma = 0;
  if (hasBought) {
    smaDailies.some((v) => {
      const smaDaily = indicators['smaMiddle' + v + 'daily'];
      //2 sell when we are close to another sma and 
      // check only smaller SMA, only if smaller SMA above buySMA, only if smaller SMA > next SMA
      if (resistanceSmaFn(5, candle, smaDaily, buysma > v && smaDaily > (indicators['smaMiddle' + buysma + 'daily']*1.10) && smaDaily > (indicators['smaMiddle' + (v + 40) + 'daily']*1.10))) {
        resistanceSma = v;
        return true;
      }
    });
  }
  return resistanceSma;
}

function getNearSma(candle, prevValue, smaDailies, indicators, procent, hasBought) {
  let nearSma = 0;
  if (!hasBought) {
    smaDailies.some((v) => {
      const smaNext = v + 40;
      const smaDaily = indicators['smaMiddle' + v + 'daily'];
      const smaNextDaily = indicators['smaMiddle' + smaNext + 'daily'];
      if (nearSmaFn(procent, candle, smaDaily, prevValue, smaDaily > smaNextDaily && smaDaily > indicators['smaMiddle' + (smaNext+40) + 'daily'] )) {
        nearSma = v;
        return true;
      }
    });
  }
  return nearSma;
}

function nearSmaFn (procent, candle, sma, prevValue, shouldCheck){
  let nearSma = false;
  if (!shouldCheck)
    return false;

    
  // if the momentum (roc too strong, adjust we buy below sma) ??
  if (candle.close * (1-procent*0.01)<=sma && candle.close >= sma){
    nearSma = true;
  }

  let prevCandle = prevValue ? prevValue.candle : undefined;

  if (nearSma && prevCandle && prevCandle.close > sma){
    nearSma = true;
  }else{
    nearSma = false;
  }

  return nearSma;
}

function breakSmaFn (procent, candle, sma, shouldCheck){
  let breakSma = false;
  if (!shouldCheck)
    return false;

  if (candle.close * (1+(procent+0)*0.01) < sma){ 
    breakSma = true;
  }

  return breakSma;
}

function resistanceSmaFn (procent, candle, sma, shouldCheck){
  let resistanceSma = false;
  if (!shouldCheck)
    return false;

  if (candle.close * (1+procent*0.01) > sma 
   && candle.close * (1+procent*0.01) < (sma * (1+(procent+2)*0.01))){ // not more than 5 procent over
    resistanceSma = true;
  }

  return resistanceSma;
}

var cciChangedSellFn = function(currentCci, prevValue){
  let prevCci = prevValue ? prevValue.cci : undefined;
  return  prevCci > 70 && currentCci < -70 
}
  
var crossSmaWithMomentum = function(currentRoc, crossSmaDaysAgo ){
  const cutMiddleWithMomentum = (crossSmaDaysAgo > 0 && crossSmaDaysAgo <= this.settings.roc.thresholds.cross_in_last_days
    && (currentRoc <= this.settings.roc.thresholds.down))
  
  return cutMiddleWithMomentum;
}
module.exports = method;
