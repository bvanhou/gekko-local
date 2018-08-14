var _ = require('lodash');
var util = require('../../core/util.js');
var log = require('../../core/log');

var handle = require('./handle');

var Reader = function(config) {
  _.bindAll(this);
  this.db = handle;

  this.watch = config.watch;
  this.config = config;
}


Reader.prototype.table = function(name){
  var name = this.watch.exchange + '_' + name;
  return [name, this.watch.currency, this.watch.asset].join('_');
}

// returns the furtherst point (up to `from`) in time we have valid data from
Reader.prototype.mostRecentWindow = function(from, to, next) {
  to = to.unix();
  from = from.unix();

  var maxAmount = to - from + 1;

  var query = this.db.query(`
  SELECT start from ${this.table('candles')}
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
      AND table_name='${this.table(name)}';
  `, function(err, result) {
    if (err) {
      return util.die('DB error at `tableExists`');
    }

    next(null, result.length === 1);
  });
}

Reader.prototype.get = function(from, to, what, next) {
  if(what === 'full'){
    what = '*';
  }

  const queryStr = `
  SELECT ${what} from ${this.table('candles')}
  WHERE start <= ${to} AND start >= ${from}
  ORDER BY start ASC
  `;

  // console.log(queryStr);
  var query = this.db.query(queryStr);

  var rows = [];
  query.on('result', function(row) {
    rows.push(row);
  });

  query.on('end',function(){
    next(null, rows);
  });
}

Reader.prototype.count = function(from, to, next) {
  var query = this.db.query(`
  SELECT COUNT(*) as count from ${this.table('candles')}
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
  SELECT COUNT(*) as count from ${this.table('candles')}
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
    FROM ${this.table('candles')}
    ORDER BY start LIMIT 1
  ) as first,
  (
    SELECT start
    FROM ${this.table('candles')}
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

Reader.prototype.close = function() {
   this.db.end();
}

module.exports = Reader;
