// This is a basic example strategy for Gekko.
// For more information on everything please refer
// to this document:
//
// https://gekko.wizb.it/docs/strategies/creating_a_strategy.html
//
// The example below is pretty bad investment advice: on every new candle there is
// a 10% chance it will recommend to change your position (to either
// long or short).

var log = require('../core/log');

// Let's create our own strat
var strat = {};

// Prepare everything our method needs
strat.init = function() {
  this.name = "Threshold"
  this.ceiling = this.settings.ceiling;
  this.bottom = this.settings.bottom;

  this.hasBought = false;
}

// What happens on every new candle?
strat.update = function(candle) {
  const updatePrice = candle.close;
//  log.debug('updatePrice'+updatePrice);
}

// For debugging purposes.
strat.log = function() {
  //log.debug('calculated random number:');
}

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function(candle) {
  const checkPrice = candle.close;

  if (checkPrice < this.bottom && this.hasBought){
    log.debug('checkPrice: '+checkPrice + ' bottom:'+this.bottom);
    this.advice("long bear");
    this.hasBought = false;
  }
  if (checkPrice > this.ceiling && !this.hasBought){
    log.debug('checkPrice: '+checkPrice + ' ceiling:'+this.ceiling);
    this.advice("short bear");
    this.hasBought = true;
  }
}

module.exports = strat;
