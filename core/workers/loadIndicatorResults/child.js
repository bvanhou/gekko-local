var _ = require('lodash');

var start = (config) => {
  var util = require(__dirname + '/../../util');

  // force correct gekko env
  util.setGekkoEnv('child-process');

  // force disable debug
  config.debug = true;
  util.setConfig(config);

  var dirs = util.dirs();

  var IndicatorLoader = require(dirs.tools + 'indicatorResultsLoader');

  console.log("gekko_id: "+config.gekko_id);
  const indicatorLoaderInstance = new IndicatorLoader(config);

  indicatorLoaderInstance.load(results => {
    const indicatorResults = {};
    results.forEach(indicatorResult => {
      if(!_.has(indicatorResults, indicatorResult.name))
         indicatorResults[indicatorResult.name] = [];
  
      indicatorResults[indicatorResult.name].push({
        result: indicatorResult.result,
        date: indicatorResult.date
      });
    });

    process.send(indicatorResults);
  })
}

process.send('ready');

process.on('message', (m) => {
  if(m.what === 'start')
    start(m.config);
});