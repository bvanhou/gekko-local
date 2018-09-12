var _ = require('lodash');
var mysql = require('mysql');

var util = require('../../core/util.js');
var dirs = util.dirs();
var log = require(util.dirs().core + 'log');


var Handle = function(config) {

  this.config = config;

  // verify the correct dependencies are installed
  var pluginHelper = require(dirs.core + 'pluginUtil');
  var pluginMock = {
    slug: 'mysql adapter',
    dependencies: config.mysql.dependencies
  };

  var cannotLoad = pluginHelper.cannotLoad(pluginMock);
  if(cannotLoad){
    util.die(cannotLoad);
  }
}

Handle.prototype.getConnection = function () {
  const config = this.config;

  var database = mysql.createConnection({
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
  });

  // Check if we could connect to the db
  database.connect(function(err) {
    if(err) {
      util.die(err);
    }
    log.debug("Verified MySQL setup: connection possible");
  });

  return database;
}

module.exports = Handle;
