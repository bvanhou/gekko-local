var _ = require('lodash');
var util = require('../../core/util.js');
var log = require('../../core/log');
var mysqlUtil = require('./util');
var resilient = require('./resilient');

var Handle = require('./handle');

var Reader = function(config) {
  _.bindAll(this);

  const handle = new Handle(config);
  this.db = handle.getConnection();
  this.dbpromise = this.db.promise();

  this.watch = config.watch;
  this.config = config;
}

// returns the furtherst point (up to `from`) in time we have valid data from
Reader.prototype.mostRecentWindow = function(from, to, next) {
  to = to.unix();
  from = from.unix();

  var maxAmount = to - from + 1;

  var query = this.db.query(`
  SELECT start from ${mysqlUtil.table('candles',this.watch)}
  WHERE start <= ${to} AND start >= ${from}
  ORDER BY start DESC
  `, function (err, result) {
    if (err) {
      // bail out if the table does not exist
      if (err.message.indexOf(' does not exist') !== -1)
        return next(false);

      log.error(err);
      return util.die('DB error while reading mostRecentWindow');
    }
  });

  var rows = [];
  query.on('result', function(row) {
    rows.push(row);
  });

  // After all data is returned, close connection and return results
  query.on('end', function() {

    // no candles are available
    if(rows.length === 0) {
      return next(false);
    }

    if(rows.length === maxAmount) {

      // full history is available!

      return next({
        from: from,
        to: to
      });
    }

    // we have at least one gap, figure out where
    var mostRecent = _.first(rows).start;

    var gapIndex = _.findIndex(rows, function(r, i) {
      return r.start !== mostRecent - i * 60;
    });

    // if there was no gap in the records, but
    // there were not enough records.
    if(gapIndex === -1) {
      var leastRecent = _.last(rows).start;
      return next({
        from: leastRecent,
        to: mostRecent
      });
    }

    // else return mostRecent and the
    // the minute before the gap
    return next({
      from: rows[ gapIndex - 1 ].start,
      to: mostRecent
    });

  });
}

Reader.prototype.tableExists = function (name, next) {
  this.db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='${this.config.mysql.database}'
      AND table_name='${mysqlUtil.table(name, this.watch)}';
  `, function(err, result) {
    if (err) {
      return util.die('DB error at `tableExists`');
    }

    next(null, result.length === 1);
  });
}

Reader.prototype.get = async function(from, to, what, next) {
  if(what === 'full'){
    what = '*';
  }

  const queryStr = `
  SELECT ${what} from ${mysqlUtil.table('candles',this.watch)}
  WHERE start <= ${to} AND start >= ${from}
  ORDER BY start ASC
  `;

  try{
    const [rows, fields] = await resilient.callFunctionWithIntervall(60, () => this.dbpromise.query(queryStr).catch((err) => {}), 5000);
    next(null, rows);
  }catch(err){
    // we have permanent error
    log.error(err);
    next(err);
  }
}

Reader.prototype.count = function(from, to, next) {
  var query = this.db.query(`
  SELECT COUNT(*) as count from ${mysqlUtil.table('candles',this.watch)}
  WHERE start <= ${to} AND start >= ${from}
  `);
  var rows = [];
  query.on('result', function(row) {
    rows.push(row);
  });

  query.on('end',function(){
    next(null, _.first(rows).count);
  });
}

Reader.prototype.countTotal = function(next) {
  var query = this.db.query(`
  SELECT COUNT(*) as count from ${mysqlUtil.table('candles',this.watch)}
  `);
  var rows = [];
  query.on('result', function(row) {
    rows.push(row);
  });

  query.on('end',function(){
    next(null, _.first(rows).count);
  });
}

Reader.prototype.getBoundry = function(next) {
  var query = this.db.query(`
  SELECT (
    SELECT start
    FROM ${mysqlUtil.table('candles',this.watch)}
    ORDER BY start LIMIT 1
  ) as first,
  (
    SELECT start
    FROM ${mysqlUtil.table('candles',this.watch)}
    ORDER BY start DESC
    LIMIT 1
  ) as last
  `);
  var rows = [];
  query.on('result', function(row) {
    rows.push(row);
  });

  query.on('end',function(){
    next(null, _.first(rows));
  });
}

Reader.prototype.getIndicatorResults = function(gekko_id, from, to, next) {
  console.log("iresults: gekko_id: "+gekko_id);
  if (!gekko_id){
    return next("gekko_id is required", null);
  }
  const queryStr = `
  SELECT * from ${this.table('iresults', this.watch)}
    WHERE date <= ${to} AND date >= ${from} AND gekko_id = '${gekko_id}'
    ORDER BY date ASC
    `;

  var query = this.db.query(queryStr);

  var rows = [];
  query.on('result', function (row) {
    row.result = JSON.parse(row.result);
    rows.push(row);
  });

  query.on('end', function () {
    next(null, rows);
  });
}

Reader.prototype.close = function() {
   // this.db.end();
}

module.exports = Reader;
