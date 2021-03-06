const _ = require('lodash');
const moment = require('moment');
const util = require('../../core/util');
const dirs = util.dirs();
const log = require('../log');

var Loader = function(config) {
  _.bindAll(this);

  this.config = config;

  const adapter = config[config.adapter];
  const Reader = require(dirs.gekko + adapter.path + '/reader');

  const daterange = config.daterange;

  this.to = moment.utc(daterange.to).startOf('minute');
  this.from = moment.utc(daterange.from).startOf('minute');

  this.reader = new Reader(config);
}

Loader.prototype.load = function(_next) {
  const next = _.once(_next);

  this.reader.getIndicatorResults(
    this.config.gekko_id,
    this.from.unix(),
    this.to.unix(),
    (err, data) => {
      if(err) {
        console.error(err);
        util.die('Encountered an error... '+err)
      }

      this.reader.close();
      next(data);
    }
  )
}

module.exports = Loader;