const _ = require('lodash');
const async = require('async');
var mysql = require('mysql');

const util = require('../../core/util.js');
const config = util.getConfig();
const dirs = util.dirs();
var myUtil = require('./util');

module.exports = done => {
  let markets = [];
  console.log(config)
  var scanClient = mysql.createConnection({
    host: config.mysql.host,
    database: config.mysql.database,
    user: config.mysql.user,
    password: config.mysql.password,
  });

  scanClient.connect( (err) => {
    if (err) {
      util.die("Error connecting to database: ", err);
    }

    var sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = '" + config.mysql.database + "'";

    var query = scanClient.query(sql, function(err, result) {
      if(err) {
        util.die("DB error while scanning tables: " + err);
      }

      async.each(result, (table, next) => {

        let parts = table.table_name.split('_');
        let exchangeName = parts.shift();
        let first = parts.shift();

        if(first === 'candles') {
          markets.push({
            exchange: exchangeName,
            currency: _.first(parts),
            asset: _.last(parts)
          });
        }
        next();
      },
      err => {
        scanClient.end();
        done(err, markets);
      });
    });
  });
}
