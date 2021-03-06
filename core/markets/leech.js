// a leech market is "semi-realtime" and pulls out candles of a
// database (which is expected to be updated regularly, like with a
// realtime market running in parallel).

const _ = require('lodash');
const moment = require('moment');

const util = require('../util');
const dirs = util.dirs();

const exchangeChecker = require(dirs.core + 'exchangeChecker');
const cp = require(dirs.core + 'cp');


var Market = function(config) {
  _.bindAll(this);
  this.config = config;

  const adapter = config[config.adapter];
  const Reader = require(dirs.gekko + adapter.path + '/reader');

  const TICKINTERVAL = 20 * 1000; // 20 seconds

  const slug = config.watch.exchange.toLowerCase();
  const exchange = exchangeChecker.getExchangeCapabilities(slug);

  if(!exchange)
    util.die(`Unsupported exchange: ${slug}`)

  const error = exchangeChecker.cantMonitor(config.watch);
  if(error)
    util.die(error, true);

  let fromTs;
  if(config.market.from){
    fromTs = moment(config.market.from).unix();
  }
  else{
    let nowTs = moment().startOf('minute');
    //start reading from db always to full hour (00:00 minutes).
    //so we can compare backtest results with realtime results.
    if (this.config.tradingAdvisor.adjustStartTime){
      nowTs = nowTs.hour(0);
      nowTs = nowTs.minute(0);
    }

    fromTs = nowTs.unix();
  }


  Readable.call(this, {objectMode: true});

  this.reader = new Reader(config);
  this.latestTs = fromTs;

  setInterval(
    this.get,
    TICKINTERVAL
  );
}

var Readable = require('stream').Readable;
Market.prototype = Object.create(Readable.prototype, {
  constructor: { value: Market }
});

Market.prototype._read = _.once(function() {
  this.get();
});

Market.prototype.get = function() {
  var future = moment().add(1, 'minute').unix();

  this.reader.get(
    this.latestTs,
    future,
    'full',
    this.processCandles
  )
}

Market.prototype.processCandles = function(err, candles) {
  var amount = _.size(candles);
  if(amount === 0) {
    // no new candles!
    return;
  }


  // TODO:
  // verify that the correct amount of candles was passed:
  //
  // if `this.latestTs` was at 10:00 and we receive 3 candles with the latest at 11:00
  // we know we are missing 57 candles...

  _.each(candles, function(c, i) {
    c.asset = this.config.watch.asset;
    c.currency = this.config.watch.currency;
    c.start = moment.unix(c.start).utc();
    this.push(c);
  }, this);

  this.sendStartAt(_.first(candles));
  cp.lastCandle(_.last(candles));

  this.latestTs = _.last(candles).start.unix() + 1;
}

Market.prototype.sendStartAt = _.once(function(candle) {
  cp.firstCandle(candle);
});

module.exports = Market;
