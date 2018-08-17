/*jshint esversion: 6 */

var _ = require('lodash');
var handle = require('./handle'); //TODO make as Object
var log = require('../../core/log');

var Store = function(done, pluginMeta) {
  _.bindAll(this);
  this.done = done;
  
  this.watch = pluginMeta.configGlobal.watch;
  this.config = pluginMeta.configGlobal;
  
  this.db = handle;
  this.upsertTables();

  this.cache = [];
  
  let TICKRATE = 20;
  if (this.config.watch.tickrate)
    TICKRATE = this.config.watch.tickrate;
  else if(this.config.watch.exchange === 'okcoin')
    TICKRATE = 2;

  this.tickrate = TICKRATE;
};

Store.prototype.table = function(name){
  return [this.watch.exchange, name, this.watch.currency, this.watch.asset].join('_');
};

Store.prototype.upsertTables = function() {
  var createQueries = [
    `CREATE TABLE IF NOT EXISTS
    ${this.table('candles')} (
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

let synchronize = false; // for synchronizing if setTimeout also wants to write
Store.prototype.writeCandles = function() {
  if (synchronize)
    return;

  if(_.isEmpty(this.cache)){
    return;
  }

  synchronize = true;

  var q = `INSERT INTO ${this.table('candles')} (start, open, high,low, close, vwp, volume, trades) VALUES ? ON DUPLICATE KEY UPDATE start = start`;
  let candleArrays = this.cache.map((c) => [c.start.unix(), c.open, c.high, c.low, c.close, c.vwp, c.volume, c.trades]);
  
  log.debug('start writing: ' + this.cache.length);
  this.db.query(q, [candleArrays],  err => {
    if (err) log.debug("Error while inserting candle: " + err);
    
    this.cache = [];
    synchronize = false;
    log.debug('end writing: ' + this.cache.length);
  });
};

Store.prototype.processCandle = function(candle, done) {
  if(!this.config.candleWriter.enabled){
    done();    return;
  }
  
  if(_.isEmpty(this.cache)){
    setTimeout(()=> { log.debug('start timer');
                      this.writeCandles();    }, this.tickrate*1000);
  }

  this.cache.push(candle);
  if (this.cache.length > 1000){
    this.writeCandles();
  } 

  done();
};

Store.prototype.finalize = function(done) {
  if(!this.config.candleWriter.enabled){
    done();
    return;
  }

  this.writeCandles();
  this.db = null;
  done();
}

module.exports = Store;
