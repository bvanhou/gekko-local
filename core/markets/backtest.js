var _ = require('lodash');
var util = require('../util');
var dirs = util.dirs();
var log = require(dirs.core + 'log');
var moment = require('moment');

var Market = function(config) {

  _.bindAll(this);
  this.pushing = false;
  this.ended = false;
  this.closed = false;
  this.config = config;

  const adapter = config[config.adapter];
  const Reader = require(dirs.gekko + adapter.path + '/reader');
  const daterange = config.backtest.daterange;

  this.to = moment(daterange.to, "YYYY-MM-DD"); //warnig deprecated fix
  this.from = moment(daterange.from, "YYYY-MM-DD");

  if(this.to <= this.from)
    util.die('This daterange does not make sense.')

  if(!this.from.isValid())
    util.die('invalid `from`');

  if(!this.to.isValid())
    util.die('invalid `to`');



  Readable.call(this, {objectMode: true});

  log.write('');
  log.info('\tWARNING: BACKTESTING FEATURE NEEDS PROPER TESTING');
  log.info('\tWARNING: ACT ON THESE NUMBERS AT YOUR OWN RISK!');
  log.write('');

  this.reader = new Reader(config);
  this.batchSize = config.backtest.batchSize;
  this.iterator = {
    from: this.from.clone(),
    to: this.from.clone().add(this.batchSize, 'm').subtract(1, 's')
  }
}

var Readable = require('stream').Readable;
Market.prototype = Object.create(Readable.prototype, {
  constructor: { value: Market }
});

Market.prototype._read = _.once(function() {
  this.get();
});

Market.prototype.get = function() {
  if(this.iterator.to >= this.to) {
    this.iterator.to = this.to;
    this.ended = true;
  }

  this.reader.get(
    this.iterator.from.unix(),
    this.iterator.to.unix(),
    'full',
    this.processCandles
  )
}

Market.prototype.processCandles = function(err, candles) {
  this.pushing = true;
  var amount = _.size(candles);

  if(amount === 0) {
    if(this.ended) {
      this.closed = true;
      this.reader.close();
      this.emit('end');
    } else {
      const errorMsg = 'Query returned no candles (do you have local data for the specified range?)';
      log.error(errorMsg)
      util.die(errorMsg);
    }
  }

  if(!this.ended && amount < this.batchSize) {
    var d = function(ts) {
      return moment.unix(ts).utc().format('YYYY-MM-DD HH:mm:ss');
    }
    const from = d(_.first(candles).start);
    const to = d(_.last(candles).start);
    log.warn(`Simulation based on incomplete market data (${this.batchSize - amount} missing between ${from} and ${to}).`);
  }

  _.each(candles, function(c, i) {
    c.asset = this.config.watch.asset;
    c.currency = this.config.watch.currency;
    c.start = moment.unix(c.start);
    this.push(c);
  }, this);

  this.pushing = false;

  this.iterator = {
    from: this.iterator.from.clone().add(this.batchSize, 'm'),
    to: this.iterator.from.clone().add(this.batchSize * 2, 'm').subtract(1, 's')
  }

  if(!this.closed)
    this.get();
}

module.exports = Market;
