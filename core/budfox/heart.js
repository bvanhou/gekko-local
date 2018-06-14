// The heart schedules and emit ticks every 20 seconds.

var util = require(__dirname + '/../util');
var log = require(util.dirs().core + 'log');

var _ = require('lodash');
var moment = require('moment');

var Heart = function(config) {
  this.lastTick = false;
  this.config = config;

  if (this.config.watch.tickrate)
      var TICKRATE = this.config.watch.tickrate;
    else if(this.config.watch.exchange === 'okcoin')
      var TICKRATE = 2;
    else
      var TICKRATE = 20;

  this.tickrate = TICKRATE;

  _.bindAll(this);
}

util.makeEventEmitter(Heart);

Heart.prototype.pump = function() {
  log.debug('scheduling ticks');
  this.scheduleTicks();
}

Heart.prototype.tick = function() {
  if(this.lastTick) {
    // make sure the last tick happened not to lang ago
    // @link https://github.com/askmike/gekko/issues/514
    if(this.lastTick < moment().unix() - this.tickrate * 3)
      util.die('Failed to tick in time, see https://github.com/askmike/gekko/issues/514 for details', true);
  }

  this.lastTick = moment().unix();
  this.emit('tick');
}

Heart.prototype.scheduleTicks = function() {
  setInterval(
    this.tick,
    +moment.duration(this.tickrate, 's')
  );

  // start!
  _.defer(this.tick);
}

module.exports = Heart;
