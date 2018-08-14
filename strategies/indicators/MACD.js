// required indicators
var EMA = require('./EMA.js');
var SMA = require('./SMA.js');

var Indicator = function(config) {
  this.input = 'candle';
  this.diff = false;
  this.short = new EMA(config.short);
  this.long = new EMA(config.long);
  this.signal = new EMA(config.signal);
}

Indicator.prototype.update = function(candle) {
  this.short.update(candle.close);
  this.long.update(candle.close);
  this.calculateEMAdiff();
  this.signal.update(this.diff);
  this.result = { macd: this.diff - this.signal.result, signal: this.signal.result, diff: this.diff, short: this.short, long: this.long } ;
}

Indicator.prototype.calculateEMAdiff = function() {
  var shortEMA = this.short.result;
  var longEMA = this.long.result;

  this.diff = shortEMA - longEMA;
}

module.exports = Indicator;
