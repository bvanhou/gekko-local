var fork = require('child_process').fork;
var util = require('../../util');
var dirs = util.dirs();

module.exports = (mode, config, callback) => {
  var debug = typeof v8debug === 'object';
  if (debug) {
    process.execArgv = [];
  }

  var child = fork(__dirname + '/child');

  // How we should handle client messages depends
  // on the mode of the Pipeline that is being ran.
  var handle = require('./messageHandlers/' + mode + 'Handler')(callback);

  const WriterClass = require(dirs.gekko + 'plugins/'+config.adapter+'/writer');

  const writer = new WriterClass(()=> {}, {configGlobal : config});


  var message = {
    what: 'start',
    mode: mode,
    config: config
  };

  child.on('message', function(m) {

    if(m === 'ready')
      return child.send(message);

    if(m === 'done')
      return child.send({what: 'exit'});

    handle.message(m, config.gekko_id);

    if (mode === "realtime" && m.type === 'indicatorResult'){ // save indicatorResults to DB
      writer.writeIndicatorResult(config.gekko_id, m.indicatorResult);
    }
  });

  child.on('exit', handle.exit);

  return child;
}
