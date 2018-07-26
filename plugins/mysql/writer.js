var _ = require('lodash');
var config = require('../../core/util.js').getConfig();
var mysql = require('mysql');

var handle = require('./handle');
var myUtil = require('./util');

var Store = function(done, pluginMeta) {
  _.bindAll(this);
  this.done = done;

  this.db = handle;
  this.upsertTables();

  this.cache = [];
}

Store.prototype.upsertTables = function() {
  var createQueries = [
    `CREATE TABLE IF NOT EXISTS
    ${myUtil.table('candles')} (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      start INT UNSIGNED UNIQUE,
      open DOUBLE NOT NULL,
      high DOUBLE NOT NULL,
      low DOUBLE NOT NULL,
      close DOUBLE NOT NULL,
      vwp DOUBLE NOT NULL,
      volume DOUBLE NOT NULL,
      trades INT UNSIGNED NOT NULL
    );`
  ];

  var next = _.after(_.size(createQueries), this.done);

  _.each(createQueries, function(q) {
    this.db.query(q,next);
  }, this);
}

Store.prototype.writeCandles = function() {
  if(_.isEmpty(this.cache)){
    return;
  }

  _.each(this.cache, candle => {
    let c = candle;
    let q = `
      INSERT INTO ${myUtil.table('candles')}
      (start, open, high,low, close, vwp, volume, trades)
      values(${c.start.unix()}, ${c.open}, ${c.high}, ${c.low}, ${c.close}, ${c.vwp}, ${c.volume}, ${c.trades}) ON DUPLICATE KEY UPDATE start = start;
    `;
    this.db.query(q, err => {
      if(err) {
        log.debug("Error while inserting candle: " + err);
      }
    });
  });

  this.cache = [];
}

var processCandle = function(candle, done) {
  this.cache.push(candle);
  if (this.cache.length > 100) 
    this.writeCandles();

  done();
};

var finalize = function(done) {
  this.writeCandles();
  this.db = null;
  done();
}

if(config.candleWriter.enabled) {
  Store.prototype.processCandle = processCandle;
  Store.prototype.finalize = finalize;
}

module.exports = Store;
