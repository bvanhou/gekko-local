/*jshint esversion: 6 */

var _ = require('lodash');
var Handle = require('./handle');
var log = require('../../core/log');
var moment = require('moment');
var mysqlUtil = require('./util');

var Store = function(done, pluginMeta) {
  _.bindAll(this);
  this.done = done;

  this.watch = pluginMeta.configGlobal.watch;
  this.config = pluginMeta.configGlobal;


  const handle = new Handle(this.config);
  this.db = handle.getConnection();
  this.upsertTables();

  this.cache = [];

  let TICKRATE = 20;
  if (this.config.watch.tickrate)
    TICKRATE = this.config.watch.tickrate;
  else if(this.config.watch.exchange === 'okcoin')
    TICKRATE = 2;

  this.tickrate = TICKRATE;
};

Store.prototype.upsertTables = function() {
  var createQueries = [
    `CREATE TABLE IF NOT EXISTS
    ${mysqlUtil.table('candles',this.watch)} (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      start INT UNSIGNED UNIQUE,
      open DOUBLE NOT NULL,
      high DOUBLE NOT NULL,
      low DOUBLE NOT NULL,
      close DOUBLE NOT NULL,
      vwp DOUBLE NOT NULL,
      volume DOUBLE NOT NULL,
      trades INT UNSIGNED NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS
    ${mysqlUtil.table('iresults',this.watch)} (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      gekko_id VARCHAR(30) NOT NULL,
      name CHAR(20) NOT NULL,
      date INT UNSIGNED NOT NULL,
      result TEXT NOT NULL,
      UNIQUE (gekko_id,name, date)
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

  var q = `INSERT INTO ${mysqlUtil.table('candles',this.watch)} (start, open, high,low, close, vwp, volume, trades) VALUES ? ON DUPLICATE KEY UPDATE start = start`;
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
  this.db = null;this
  done();
}


Store.prototype.writeIndicatorResult = function(gekko_id, indicatorResult) {
  if (!gekko_id)
    return;

  const date = moment.utc(indicatorResult.date).unix();
  // console.log(date.format('YYYY-MM-DD HH:mm'))
  var q = `INSERT INTO ${mysqlUtil.table('iresults',this.watch)} (gekko_id, name, date, result) VALUES ( '${gekko_id}', '${indicatorResult.name}', ${date}, '${JSON.stringify(indicatorResult.result)}')
     ON DUPLICATE KEY UPDATE result = '${JSON.stringify(indicatorResult.result)}'
  `; //TODO duplicate key?

  this.db.query(q, (err, result) => {
    if (err) log.debug("Error while inserting indicator Result: " + err);
  });
}

module.exports = Store;
