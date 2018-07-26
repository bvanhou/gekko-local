var config = require('../../core/util.js').getConfig();

var watch = config.watch;
if(watch) {
  var settings = {
    exchange: watch.exchange,
    pair: [watch.currency, watch.asset]
  }
}

module.exports = {
  settings: settings,
  host: config.mysql.host,
  database: config.mysql.database,
  user: config.mysql.user,
  password: config.mysql.password,

  // returns table name
  table: function (name) {
    var name = watch.exchange + '_' + name;
    var fullName = [name, settings.pair.join('_')].join('_');
    return fullName;
  }
}
