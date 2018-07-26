// If you want to use your own trading methods you can
// write them here. For more information on everything you
// can use please refer to this document:
//
// https://github.com/askmike/gekko/blob/stable/docs/trading_methods.md
var log = require('../core/log.js');
var helper = require('../plugins/strategieshelper.js');
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
  this.pauseDays = 0;

  // how many candles do we need as a base
  // before we can start giving advice?
  this.requiredHistory = this.tradingAdvisor.historySize;

  // define the indicators we need
  this.addTulipIndicator('mycci',     'cci', helper.prepareForTulip( this.settings.cci.parameters));
  // filters
   this.addTulipIndicator('myaroonosc','aroonosc', helper.prepareForTulip( this.settings.aroonosc.parameters));
  //this.addTulipIndicator('mymacd', 'macd', customMacdSettings);
  this.addTulipIndicator('emaLong',   'sma', helper.prepareForTulip( this.settings.smaLong.parameters));
  this.addTulipIndicator('emaMiddle', 'sma', helper.prepareForTulip( this.settings.smaMiddle.parameters));
  this.addTulipIndicator('emaShort',  'sma', helper.prepareForTulip( this.settings.smaShort.parameters));
}

// What happens on every new candle?
method.update = function(candle) {
  this.candle = candle;
  // nothing!
}


method.log = function() {
  // nothing!
}

// Based on the newly calculated
// information, check if we should
// update or not.
method.check = function(candle) {

  const cci = this.tulipIndicators.mycci.result.result;
  const aroonosc = this.tulipIndicators.myaroonosc.result.result;
  const emaLong = this.tulipIndicators.emaLong.result.result;
  const emaMiddle = this.tulipIndicators.emaMiddle.result.result;
  const emaShort = this.tulipIndicators.emaShort.result.result;
  //const macd = this.tulipIndicators.mymacd.result.macdHistogram;

  let crossShortVar = helper.crossShort(this.prevEmaShort, this.prevEmaMiddle, emaShort, emaMiddle, candle);
  if(!this.hasBought
      && (
        (cci < this.settings.cci.thresholds.down)
        || crossShortVar
      )
      //&& cci > this.settings.cci.thresholds.down_extreme
      && this.prevCci > cci //just additional check tha cci is falling
      //&& this.prevEmaLong > emaLong //worse performance
      //&& aroonosc > this.settings.aroonosc.thresholds.down //against Trend (when aroon is up we have pos bull)
      ){ //strong long but not extreme!
      log.debug('macd: '+' aroonosc: ' + Number(aroonosc).toFixed(2) + ' cci '+Number(cci).toFixed(2));
      this.hasBought = true;
      this.crossShort = crossShortVar;
      this.advice('short bear');
    }else if(this.hasBought
      && ( cci > this.settings.cci.thresholds.up
         || (this.crossShort && candle.close > emaShort)
        )
      ) { // sell shorts
      this.hasBought = false;
      this.advice('long bear');
  }
  this.prevCci = cci;
  this.prevEmaLong = emaLong;
  this.prevEmaMiddle = emaMiddle;
  this.prevEmaShort = emaShort;
  this.prevCandle = candle;
}

module.exports = method;
