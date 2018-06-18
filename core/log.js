var winston = require('winston');
const { format } = winston;
const { combine, timestamp, label, printf } = format;

const SentryTransport = require('./logstransport/sentry_transport');
const LogzTransport = require('./logstransport/logz_transport');
/*

  Lightweight logger, print everything that is send to error, warn
  and messages to stdout (the terminal). If config.debug is set in config
  also print out everything send to debug.

*/

var moment = require('moment');
var fmt = require('util').format;
var _ = require('lodash');
var util = require('./util');
var config = util.getConfig();
var debug = config.debug;
var silent = config.silent;

const winstonLogger = winston.createLogger({
  transports: [

    new winston.transports.File({
      name : 'filelogger',
      filename: 'logs/all-gekko.log',
      level: 'debug',
      handleExceptions: false,
      json: false,
      maxsize: 5242880, //5MB
      maxFiles: 5,
      colorize: false,
      format: combine(
          timestamp(), // utc!
          winston.format.printf(info =>`${info.timestamp} ${info.level}: ${info.message}`)
      )
    }),

    // send only errors to Sentry (good library for errors fixing)
    new SentryTransport({
      token : process.env.SENTRY_DSN,
      level: 'error'
    }),

    new LogzTransport({
      token: process.env.LOGZ_KEY,
      host: 'listener.logz.io',
      type: 'gekko',
      level: 'info'
    }),
  ]
});


var sendToParent = function() {
  var send = method => (...args) => {
    process.send({'log': args.join(' ')});
  }

  return {
    error: send('error'),
    warn: send('warn'),
    info: send('info'),
    debug: send('info'), //TODO there is no debug in parent?
    write: send('write')
  }
}

var Log = function() {
  _.bindAll(this);
  this.env = util.gekkoEnv();
  this.mode = util.gekkoMode();

  if(this.env === 'standalone')
    this.output = console;
  else if(this.env === 'child-process')
    this.output = sendToParent();
};

Log.prototype = {
  _write: function(method, args, name) {
    if(!name)
      name = method.toUpperCase();

    var message = moment().format('YYYY-MM-DD HH:mm:ss');
    message += ' (' + name + '):\t';

    const messageWithArgs = fmt.apply(null, args)

    // only for stdout
    message += messageWithArgs
    this.output[method](message);

    if (this.mode === 'realtime'){
      // log with winston
      winstonLogger.log(method, messageWithArgs);
    }
  },
  error: function() {
    this._write('error', arguments);
  },
  warn: function() {
    this._write('warn', arguments);
  },
  info: function() {
    this._write('info', arguments);
  },
  write: function() {
    var args = _.toArray(arguments);
    var message = fmt.apply(null, args);
    this.output.info(message);
  }
}

if(debug)
  Log.prototype.debug = function() {
    this._write('debug', arguments, 'DEBUG');
  }
else
  Log.prototype.debug = _.noop;

if(silent) {
  Log.prototype.debug = _.noop;
  Log.prototype.info = _.noop;
  Log.prototype.warn = _.noop;
  Log.prototype.error = _.noop;
  Log.prototype.write = _.noop;
}

module.exports = new Log;
module.exports.winstonLogger = winstonLogger;
