var config = require('../../core/util.js').getConfig();

var watch = config.watch;
if(watch) {
  var settings = {
    exchange: watch.exchange,
    pair: [watch.currency, watch.asset]
  }
}
// console.log(config);
module.exports = {
  settings: settings,

  // returns table name
  table: function (name) {
    var name = watch.exchange + '_' + name;
    var fullName = [name, settings.pair.join('_')].join('_');
    return fullName;
  }
}
