var _ = require('lodash');

var sqlite = require('./handle');
var util = require('../../core/util');
var log = require('../../core/log');

var Store = function(done, pluginMeta) {
  _.bindAll(this);
  this.done = done;

  this.watch = pluginMeta.config.watch;
  this.config = pluginMeta.config;

  this.db = sqlite.initDB(false);
  this.db.serialize(this.upsertTables);

  this.cache = [];
  this.buffered = util.gekkoMode() === "importer" || true;

  if (this.config.watch.tickrate)
      var TICKRATE = this.config.watch.tickrate;
    else if(this.config.watch.exchange === 'okcoin')
      var TICKRATE = 2;
    else
      var TICKRATE = 20;

  this.tickrate = TICKRATE;
}

Store.prototype.table = function(name){
  return [name, this.watch.currency, this.watch.asset].join('_');
}

Store.prototype.upsertTables = function() {
  var createQueries = [
    `
      CREATE TABLE IF NOT EXISTS
      ${this.table('candles')} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start INTEGER UNIQUE,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        vwp REAL NOT NULL,
        volume REAL NOT NULL,
        trades INTEGER NOT NULL
      );
    `,

    // TODO: create trades
    // ``

    // TODO: create advices
    // ``
  ];

  var next = _.after(_.size(createQueries), this.done);

  _.each(createQueries, function(q) {
    this.db.run(q, next);
  }, this);
}

let synchronize = false; // for synchronizing if setTimeout also wants to write
Store.prototype.writeCandles = function() {
  log.debug('synchronize '+synchronize + ' '+this.cache.length);
  if (synchronize)
    return;

  if(_.isEmpty(this.cache))
    return;

  synchronize = true;

  var transaction = function() {
    this.db.run("BEGIN TRANSACTION");

    var stmt = this.db.prepare(`
      INSERT OR IGNORE INTO ${this.table('candles')}
      VALUES (?,?,?,?,?,?,?,?,?)
    `, function(err, rows) {
        if(err) {
          log.error(err);
          return util.die('DB error at INSERT: '+ err);
        }
      });

    _.each(this.cache, candle => {
      stmt.run(
        null,
        candle.start.unix(),
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.vwp,
        candle.volume,
        candle.trades
      );
    });

    stmt.finalize();

    this.db.run("COMMIT");

    this.cache = [];
  }
  log.debug('write candles cache size: ' +this.cache.length +' for '+this.table('candles') +' '+ this.cache[0].start.format('YYYY-MM-DD HH:mm:ss'));

  this.db.serialize(_.bind(transaction, this));
  synchronize = false;
}

Store.prototype.processCandle = function(candle, done) {
  if (!this.config.candleWriter.enabled)
    return;

  // log.debug('got candle for '+this.table('candles') + ' '+ candle.asset + ' '+ candle.start.format('YYYY-MM-DD HH:mm:ss'));
  // cache candles for 15sec
  if(_.isEmpty(this.cache)){
    //log.debug('start timer: '+new Date())
    setTimeout(()=> { log.debug('start writing: ' + this.cache.length);
                      this.writeCandles();    }, this.tickrate*1000);
  }
  this.cache.push(candle);

  if (!this.buffered || this.cache.length > 1000){
    //console.log('start timer: '+this.startcachets + ' now: '+now)
    this.writeCandles();
  }

  done();
};

Store.prototype.finalize= function(done) {
  if (!this.config.candleWriter.enabled)
    return;

  this.writeCandles();
  this.db.close(() => { done(); });
  this.db = null;
}

// TODO: add storing of trades / advice?

// var processTrades = function(candles) {
//   util.die('NOT IMPLEMENTED');
// }

// var processAdvice = function(candles) {
//   util.die('NOT IMPLEMENTED');
// }

// if(config.tradeWriter.enabled)
//  Store.prototype.processTrades = processTrades;

// if(config.adviceWriter.enabled)
//   Store.prototype.processAdvice = processAdvice;

module.exports = Store;
