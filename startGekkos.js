const dotenv = require("dotenv");
const path  = require ("path");
dotenv.config({ path: ".env" });

const _ = require('lodash');
const promisify = require('tiny-promisify');
const moment = require('moment');

const pipelineRunner = promisify(require('./core/workers/pipeline/parent'));
const pipeline = require('./core/pipeline');
const util = require('./core/util');

const base = require('./sample-config');
const cryptocompare = require('./cryptocompare/cc');

const log = require('./core/log');

//let strategiesMin = ['CCI', 'DEMA', 'MACD', 'PPO', 'RSI', 'StochRSI', 'TMA', 'TSI', 'UO', 'varPPO']
let strategiesMin = ['MACD', 'TSI', 'PPO', 'StochRSI', 'TMA'] //

// get all assets!
var Trader = require(util.dirs().exchanges + 'kraken');
capabilities = Trader.getCapabilities();

let assets = ['ETH', 'XBT', 'XRP', 'XLM']; //for Kraken is XBT!
//assets = capabilities.assets;

startMarketWatchers();

function startMarketWatchers() {
  for (let asset of assets) { // ['ETH'] ){ capabilities.assets
    for (let currency of  ['EUR']){ //) { //capabilities.currencies
      let market = _.find(capabilities.markets, (market) => {
        return market.pair[0] === currency && market.pair[1] === asset
      });

      if (market && asset !== 'XDG'){ // we have market for it
        let myconfig = {
        "watch": {exchange: 'kraken',   currency: currency,      asset: asset, usecryptocompare : false},
        "candleWriter":{"enabled":true,"adapter":"sqlite"},
        "tradingAdvisor":{"enabled":false},
        "rabbitmq":{"enabled": false},
        "paperTrader":{"enabled":false},
        "performanceAnalyzer":{"enabled":false},
        "nodeipc":{"enabled": false, "enableProcessAdvice": false}, // we dont need nodeipc for sending quota here!
        "mode":"realtime"}

        log.info("start watch gekko for "+asset+' '+currency)
        startGekko(myconfig);
      }
   }
 }
}


function startStrategies(){
  for (let strategy of strategiesMin){
    for (let asset of assets ){ // capabilities.assets
      for (let currency of ['EUR'] ){ //capabilities.currencies
        let market = _.find(capabilities.markets, (market) => {
          return market.pair[0] === currency && market.pair[1] === asset
        });

        if (market && asset !== 'XDG'){ // we have market for it
          startStrategy(strategy, {exchange: 'kraken',   currency: currency, asset: asset});
        }
      }
    }
  }
}

function startStrategy(strategy, watchMarket){
  console.log("start "+strategy)
  let leeach_strategy = {
                "watch":watchMarket,
                "market":{"type":"leech"},
                "mode":"realtime",
                "rabbitmq":{"enabled": false},
                "nodeipc":{"enabled": true, "enableProcessAdvice": true},
                "candleWriter":{"enabled":false,"adapter":"sqlite"},
                "paperTrader":{"enabled":false},
                "performanceAnalyzer":{"enabled":false},
                "adviceLogger":{"enabled":true},
                "tradingAdvisor":{"enabled":true,"method":strategy,"candleSize":2,"historySize":10}
              };

  const requiredHistoricalData = leeach_strategy.tradingAdvisor.candleSize * leeach_strategy.tradingAdvisor.historySize;

  const optimal = moment().utc().startOf('minute')
    .subtract(requiredHistoricalData, 'minutes')
    .unix();

  // TODO get Data some minutes ago from available MarketWatcher firstCandle!
  // const available = moment
  //   .utc(this.existingMarketWatcher.firstCandle.start)
  //   .unix();

  // startAt = moment.unix(Math.max(optimal, available)).utc().format();
  leeach_strategy.market.from = moment.unix(optimal).utc().format();

  startGekko(leeach_strategy);
}

setTimeout(startStrategies, 4000);

function startGekkoAsChildProcess(body) {

  const mode = body.mode;

  let config = {};

  _.merge(config, base, body);

  let errored = false;
  const child = pipelineRunner(mode, config, (err, event) => {

    if(err) {
      if(errored)
        return;

      errored = true;
      console.error('RECEIVED ERROR IN GEKKO');
      console.error(err);
    }
  });
}

function startGekko(body) {
  const mode = body.mode;

  let config = {};

  _.merge(config, base, body);
  /*
  console.log(body)
  console.log(base)
  console.log(config)
  */

  var dirs = util.dirs();
  util.setConfig(config);

  // force correct gekko mode & config
  util.setGekkoMode(mode);

  pipeline({
    config: config,
    mode: mode
  });
}
