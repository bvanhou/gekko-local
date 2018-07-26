// helpers
var _ = require('lodash');
var log = require('../core/log.js');

var helper = require('../plugins/strategieshelper.js');

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
  this.historySize = this.settings.cci.history;
  this.persisted = this.settings.cci.thresholds.persistence;

  this.hasBought = false;

  // log.debug("CCI started with:\nup:\t", this.uplevel, "\ndown:\t", this.downlevel, "\npersistence:\t", this.persisted);
  // define the indicators we need
  this.addIndicator('CCI_without_LRC', 'CCI', this.settings.cci.parameters);
  this.addIndicator('CCI_with_LRC', 'CCI_LRC', this.settings.cci.parameters);
  this.addTulipIndicator('tulipcci', 'cci', helper.prepareForTulip( this.settings.cci.parameters));

  this.addIndicator('smaLong',   'SMA', this.settings.smaLong.parameters.optInTimePeriod);
  this.addIndicator('smaMiddle', 'SMA', this.settings.smaMiddle.parameters.optInTimePeriod);
  this.addIndicator('smaShort',  'SMA', this.settings.smaShort.parameters.optInTimePeriod);


}

// what happens on every new candle?
method.update = function(candle) {
}

// for debugging purposes: log the last calculated
// EMAs and diff.
method.log = function(candle) {
    // var cci = this.indicators.mycci;
    // if (typeof(cci.result) == 'boolean') {
    //     log.debug('Insufficient data available. Age: ', cci.size, ' of ', cci.maxSize);
    //     return;
    // }
    //
    // log.debug('calculated CCI properties for candle:');
    // log.debug('\t', 'Price:\t\t', candle.close.toFixed(8));
    // log.debug('\t', 'CCI tp:\t', cci.tp.toFixed(8));
    // log.debug('\t', 'CCI tp/n:\t', cci.avgtp.toFixed(8));
    // log.debug('\t', 'CCI md:\t', cci.mean.toFixed(8));
    // if (typeof(cci.result) == 'boolean' )
    //     log.debug('\t In sufficient data available.');
    // else
    //     log.debug('\t', 'CCI:\t\t', cci.result.toFixed(2));
}

/*
 *
 */
method.check = function(candle) {
  this.CCI_without_LRC = this.indicators.CCI_without_LRC.result;
  this.CCI_with_LRC = this.indicators.CCI_with_LRC.result;

  this.tulipcci = this.tulipIndicators.tulipcci.result.result;

  this.smaLong = this.indicators.smaLong.result;
  this.smaMiddle = this.indicators.smaMiddle.result;

  if (this.tulipcci != undefined){
    log.debug (candle.start.format('YYYY-MM-DD HH:mm')+ ' CCI_without_LRC: '+this.CCI_without_LRC.toFixed(2)+ ' CCI_with_LRC: '+this.CCI_with_LRC.toFixed(2)+ ' tulipcci: '+this.tulipcci.toFixed(2));
  }

  if(this.settings.cci.thresholds.up < this.tulipcci && !this.hasBought){ //strong long
    this.hasBought = true;
    this.advice('long');
  }else  if(this.settings.cci.thresholds.down > this.tulipcci && this.hasBought) { //strong short
    this.hasBought = false;
    this.advice('short');
  }
}

module.exports = method;
