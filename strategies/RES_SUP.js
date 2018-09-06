/*jshint esversion: 6 */
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
  this.requiredHistory = this.tradingAdvisor.historySize;

  // this.candleSizeLongerPeriod = 6 // 6*240= 1440;
  this.nearSmaProcent = this.settings.res_sup.nearSmaProcent;
  this.breakSmaProcent = this.settings.res_sup.breakSmaProcent; //6 best btc = 3% xrp = 3%

  this.buyingAge = 0;

  this.trend = {
    direction: 'undefined',
    duration: 0,
    persisted: false,
    adviced: false
  };

  this.hasBoughtBull = false;
  this.hasBoughtBear = false;
  this.bearMarket = false;
  this.prevValues = [];

  // define the indicators we need
  // this.addIndicator('cci',   'CCI', this.settings.cci.parameters);
  // this.addIndicator('rsi',   'RSI', this.settings.rsi.parameters);
  // this.addIndicator('macd',  'MACD', this.settings.macd.parameters);
  // this.addIndicator('roc',   'ROC', this.settings.roc.parameters.optInTimePeriod);
  // this.addIndicator('adx',   'ADX', this.settings.adx.parameters.ADXLength );
  // this.addIndicator('stcDaily',   'STC_Rob', this.settings.stcDaily.parameters, this.candleSizeLongerPeriod);
  // this.addIndicator('stc',   'STC_Rob', this.settings.stc.parameters);

  //this.addTulipIndicator('bbands', 'bbands', this.settings.bbands.parameters);

  this.addIndicator('smaMiddle20', 'SMA', this.settings.smaMiddle20.parameters.optInTimePeriod);

  // always calculate daily sma
  // 24h =  1440; 1440/240 = 6
  let factor = 1440 / this.tradingAdvisor.candleSize;

  //TODO evtl. 140 +-10!
  this.smaDailies = [20,60,100,140,180,220,260]; //
  this.smaDailies.forEach(v => {
    this.addIndicator('smaMiddle'+v+'daily', 'EMA_ENVELOPE', {optInTimePeriod : (20 * factor ), offset: (140-v)/1 });
  });

  this.settings.aroonosc.parameters.optInTimePeriod = 14 * factor/6; //aroonsc alwyas as 4h
  this.addTulipIndicator('aroonosc', 'aroonosc', this.settings.aroonosc.parameters);
}

// what happens on every new candle?
method.update = function(candle) {
  log.debug("requiredHistory:" + this.requiredHistory + " age:" +this.age);
}

// for debugging purposes: log the last calculated
method.log = function(candle) {
}

method.methodUpdateLongerPeriod = function(candle) {
}

method.check = function(candle) {
  this.smaDailies.forEach(v => this['smaMiddle'+v+'daily'] = this.indicators['smaMiddle'+v+'daily'].result);
  this.skipCandle = false;

  //candle: candle;
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


  this.buyingAge = this.buyingAge > 0? this.buyingAge+1 : 0;
  //sell when sma broken
  //1. candle close under sma
  this.breakSma = 0;
  if ((!this.bearMarket && this.hasBoughtBull) || (this.bearMarket && this.hasBoughtBear)){
    const smaDailies = this.bearMarket ? this.smaDailies.reverse() : this.smaDailies;
    smaDailies.some((v)=> {
      const smaDaily = this['smaMiddle'+v+'daily'];
      if (breakSmaFn(this.breakSmaProcent, currentValue.candle, smaDaily, this.bearMarket, (this.buysma === v)
                // sell if eg MA20 breaks with one of three prevCandle > MA20
                || (!this.bearMarket && this.buysma > v &&  this.prevValues.slice(-5).some((prevValue) => prevValue.candle.close > smaDaily ))
                || ( this.bearMarket && this.buysma < v &&  this.prevValues.slice(-5).some((prevValue) => prevValue.candle.close < smaDaily ))
          )){
        this.breakSma = v;
        if (!this.bearMarket && (currentValue.candle.close < this['smaMiddle'+this.settings.res_sup.breakSmaBearMarket+'daily'])){ //
          this.bearMarket = true; //break MA then bearMarket
          console.log('set bearMarket = true');
        }else if (this.bearMarket && (currentValue.candle.close >  this['smaMiddle'+this.settings.res_sup.breakSmaBullMarket+'daily'])){
          //XBT 140 vs 140 3%breakSma ETH bull 100 vs bear 180 6%breakSMA XRP 140 vs 140
          this.bearMarket = false;
          console.log('set bearMarket = false');
        }
        return true;
      }
    });
  }



  log.debug (candle.start.format('YYYY-MM-DD HH:mm')
   + ' currCandle: '+candle.close.toFixed(2)
   + ' std: '+(this.indicators.smaMiddle140daily ? (this.indicators.smaMiddle140daily.std * 0.1).toFixed(2) : '')

  );
}

// we can make hier a stoploss?
method.candleOneMin = function(candle) {
  const isAllowedToCheck = this.requiredHistory <= this.age;
  if (!isAllowedToCheck){
    return;
  }

  let isTrend = this.currentValue.aroonosc >= 50 || this.currentValue.aroonosc <= -50;

  //near smaLine within x%
  let nearSma = getNearSma(candle, this.prevValue, this.smaDailies, this, this.nearSmaProcent, this.bearMarket, ((!this.bearMarket && !this.hasBoughtBull) || (this.bearMarket && !this.hasBoughtBear)));
  let resistanceSma = getResistanceSma(candle, this.smaDailies, this, this.buysma, this.bearMarket, (!this.bearMarket && this.hasBoughtBull) || (this.bearMarket && this.hasBoughtBear));

  //sell
  //let cciChangedSell = cciChangedSellFn(currentValue.cci, prevValue);

  //sell when we have in previous values max STC that is over thresholds.up
  // let maxPrevStc =this.prevValues.length > 1 ? Math.max(this.prevValues.slice(0, -1).map(v => v.stc)) : 0;
  // let stcSellSignal = (currentValue.stc <= this.settings.stc.thresholds.down && maxPrevStc >= this.settings.stc.thresholds.up);

  // if (!this.hasBoughtBull && candle.start > moment("2017-07-16 10:00:00") && candle.start < moment("2017-07-16 15:00:00")){

    // log.debug(candle.start.format('YYYY-MM-DD HH:mm')
    // + ' prevCandle: '+(prevValue ? prevValue.candle.close.toFixed(2) : '')
    // + ' curCandle:' +currentValue.candle.close.toFixed(2) + ' currMin:'+candle.close.toFixed(2)
    // + ' sma140:' +this.smaMiddle140daily.toFixed(2)
    // + ' sma180:' +this.smaMiddle180daily.toFixed(2)
    // + ' nearSma: '+nearSma ) ;
  // }


  let buyadviceProp = {nearSma : nearSma, isTrend: isTrend, bearMarket: this.bearMarket}
  //if (this.bearMarket && nearSma > 0) console.log('bear Market should buy bear!')

  let selladviceProp = {breakSma: this.breakSma, bearMarket: this.bearMarket, resistanceSma: resistanceSma}
  // buy bull trend
  if (this.hasBoughtBull || !this.bearMarket){
    this.bullTrendStrat(candle, buyadviceProp, selladviceProp);
  }
  // buy bear trend
  if (this.hasBoughtBear || this.bearMarket){
    this.bearTrendStrat(candle, buyadviceProp, selladviceProp);
  }

  // buy range

  //save prev
  this.prevCandleOneMin = candle;
}

method.bullTrendStrat = function(candle, buyadviceProp, selladviceProp){

  if (!this.hasBoughtBull
    //&& !this.skipCandle
    && ( buyadviceProp.nearSma > 0 )
    && buyadviceProp.isTrend
  ){
    this.hasBoughtBull = true;
    this.advice('long', candle, buyadviceProp);
    this.buyingAge = 1;
    // merken sma
    this.buysma = buyadviceProp.nearSma;
    this.breakSma = 0;
    this.prevValues = this.prevValues.slice(-1); // get rid of previous values
    this.stop = candle.close*0.90;   // stoploss max 10%
    // this.buyprice = candle.close;
    // this.pullStopOnce = false;
  }else if (this.hasBoughtBull
    && (selladviceProp.breakSma > 0
      // || selladviceProp.resistanceSma > 0
      // || (candle.close < this.stop)
      ) //|| this.buyingAge >= 10

  ){
    this.hasBoughtBull = false;
    this.advice('short', candle, selladviceProp);
    this.buyingAge = 0;
    this.breakSma = 0;
    this.buysma = 0;
    this.stop = 0;
    this.skipCandle = true;
  }
}


method.bearTrendStrat = function(candle, buyadviceProp, selladviceProp){

  if (!this.hasBoughtBear
    //&& !this.skipCandle
    && ( buyadviceProp.nearSma > 0 )
    && buyadviceProp.isTrend
  ){
    this.hasBoughtBear = true;
    this.advice('short bear', candle, buyadviceProp);
    this.buyingAge = 1;
    // merken sma
    this.buysma = buyadviceProp.nearSma;
    this.breakSma = 0;
    this.prevValues = this.prevValues.slice(-1); // get rid of previous values
     this.stop = candle.close*1.10;   // stoploss max 5%
    // this.buyprice = candle.close;
    // this.pullStopOnce = false;
  }else if (this.hasBoughtBear
    && (selladviceProp.breakSma > 0
      //  || selladviceProp.resistanceSma > 0
      //  || (candle.close > this.stop)
      ) //|| this.buyingAge >= 10

  ){
    this.hasBoughtBear = false;
    this.advice('long bear', candle, selladviceProp);
    this.buyingAge = 0;
    this.breakSma = 0;
    this.buysma = 0;
    this.stop = 0;
    this.skipCandle = true;
  }
}


function getResistanceSma(candle, smaDailies, indicators, buysma, bearMarket, shouldCheck) {
  let resistanceSma = 0;
  if (shouldCheck) {
    smaDailies = bearMarket ? smaDailies.reverse() : smaDailies;
    smaDailies.some((v) => {
      const smaDaily = indicators['smaMiddle' + v + 'daily'];
      //2 sell when we are close to another sma and
      // check only smaller SMA, only if smaller SMA above buySMA, only if smaller SMA > next SMA
      if (resistanceSmaFn(1, candle, smaDaily, bearMarket, (!bearMarket && (buysma > v)) || (bearMarket && (buysma < v)) )) {
        resistanceSma = v;
        return true;
      }
    });
  }
  return resistanceSma;
}

function getNearSma(candle, prevValue, smaDailies, indicators, procent, bearMarket, shouldCheck) {
  let nearSma = 0;
  if (shouldCheck) { // first try with lowest SMA
    smaDailies = !bearMarket ? smaDailies.reverse() : smaDailies;
    smaDailies.some((v) => {
      // if ((!bearMarket && v < 100) || (bearMarket && v >180)) return false; // no buy at upper bands or lower bands
      const smaNext = !bearMarket ? v - 40 : v+40;
      const smaDaily = indicators['smaMiddle' + v + 'daily'];
      const smaNextDaily = indicators['smaMiddle' + smaNext + 'daily'];
      if (nearSmaFn(procent, candle, smaDaily, prevValue, bearMarket, (!bearMarket && smaDaily < smaNextDaily) || (bearMarket)
          // with reverse with need check MA20 explicitly
          || (!bearMarket && v=== 20 && smaDaily  > indicators['smaMiddle' + (v+40) + 'daily'])
          || ( bearMarket && v=== 220 && smaDaily < indicators['smaMiddle' + (v-40) + 'daily'])
        )) {
        nearSma = v;
        //if (bearMarket) console.log('bear Market should buy bear!' +nearSma)
        return true;
      }
    });
  }
  return nearSma;
}

function nearSmaFn (procent, candle, sma, prevValue, bearMarket, shouldCheck){
  let nearSma = false;
  if (!shouldCheck) return false;


  if (!bearMarket){
    // if the momentum (roc too strong, adjust we buy below sma) ??
    if (candle.close * (1-procent*0.01)<=sma && candle.close >= sma){
      nearSma = true;
    }
  }else{
    if (candle.close * (1+procent*0.01)>=sma && candle.close <= sma){
      nearSma = true;
    }
  }

  let prevCandle = prevValue ? prevValue.candle : undefined;

  if (nearSma && prevCandle && ((!bearMarket && prevCandle.close > sma) || (bearMarket && prevCandle.close < sma))) {
    nearSma = true;
  }else{
    nearSma = false;
  }

  return nearSma;
}

function breakSmaFn (procent, candle, sma, bearMarket, shouldCheck){
  let breakSma = false;
  if (!shouldCheck)  return false;

  //if (bearMarket) console.log('bearMarket breakSMA shouldCheck')

  if ((!bearMarket && candle.close * (1+(procent+0)*0.01) < sma) || (bearMarket && candle.close * (1-(procent+0)*0.01) > sma)){
    breakSma = true;
    //if (bearMarket) console.log('bearMarket breakSMA')
  }

  return breakSma;
}

function resistanceSmaFn (procent, candle, sma, bearMarket, shouldCheck){
  let resistanceSma = false;
  if (!shouldCheck)
    return false;

  if (!bearMarket && candle.close * (1+procent*0.01) > sma
   && candle.close * (1+procent*0.01) < (sma * (1+(procent+2)*0.01))){ // not more than 5 procent over
    resistanceSma = true;
  }else
  if (bearMarket && candle.close * (1-procent*0.01) < sma
   && candle.close * (1-procent*0.01) > (sma * (1-(procent+2)*0.01))){ // not more than 5 procent over
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
