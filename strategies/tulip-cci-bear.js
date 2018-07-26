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
  this.addTulipIndicator('smaLong',   'sma', helper.prepareForTulip( this.settings.smaLong.parameters));
  this.addTulipIndicator('smaMiddle', 'sma', helper.prepareForTulip( this.settings.smaMiddle.parameters));
  this.addTulipIndicator('smaShort',  'sma', helper.prepareForTulip( this.settings.smaShort.parameters));
}

// What happens on every new candle?
method.update = function(candle) {
  this.candle = candle;

  this.cci = this.tulipIndicators.mycci.result.result;
  this.aroonosc = this.tulipIndicators.myaroonosc.result.result;
  this.smaLong = this.tulipIndicators.smaLong.result.result;
  this.smaMiddle = this.tulipIndicators.smaMiddle.result.result;
  this.smaShort = this.tulipIndicators.smaShort.result.result;

  if (this.smaLong){    this.smaLong = Number(this.smaLong.toFixed(2));  }
  if (this.smaMiddle){    this.smaMiddle = Number(this.smaMiddle.toFixed(2));  }
  if (this.cci){    this.cci = Number(this.cci.toFixed(2));  }
}


method.log = function(candle) {
  log.debug (candle.start.format('YYYY-MM-DD HH:mm')+ ' cci: '+this.cci + ' smaLong:'+this.smaLong + ' '+this.smaMiddle);
}

// Based on the newly calculated
// information, check if we should
// update or not.
method.check = function(candle) {

  /*
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
  */

  let crossShortVar = helper.crossShort(this.prevsmaShort, this.prevsmaMiddle, this.smaShort, this.smaMiddle);
  crossShortVar = false;
  if(!this.hasBought
      && this.cci < this.settings.cci.thresholds.down
      && this.smaMiddle < this.smaLong
      //&& this.cci > this.settings.cci.thresholds.down_extreme // make it worse
      //&& this.prevCci > this.cci //just additional check tha cci is falling make it worse
      //&& this.prevsmaLong > smaLong //worse performance
      //&& this.aroonosc < this.settings.aroonosc.thresholds.down //Trend (when aroon is up we have pos bull)
      ){ //strong short

      log.debug(' cci '+this.cci + ' smaMiddle: '+this.smaMiddle + ' smaLong:'+this.smaLong + ' '+(this.smaMiddle < this.smaLong));
      this.hasBought = true;
      this.crossShort = crossShortVar;
      this.advice('short bear');
    }else if(this.hasBought
      && ( this.cci > this.settings.cci.thresholds.up
         || (candle.close > this.smaMiddle)
        )
      ) { // sell shorts
      this.hasBought = false;
      this.advice('long bear');
  }
  this.prevCci = this.cci;
  this.prevsmaLong = this.smaLong;
  this.prevsmaMiddle = this.smaMiddle;
  this.prevsmaShort = this.smaShort;
  this.prevCandle = this.candle;
}

module.exports = method;
