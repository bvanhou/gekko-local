// simple POST request that returns the backtest result

/*jshint esversion: 6 */
const _ = require('lodash');
const {promisify} = require('util');

const pipelineRunner = promisify(require('../../core/workers/pipeline/parent'));

// starts a backtest
// requires a post body like:
//
// {
//   gekkoConfig: {watch: {exchange: "poloniex", currency: "USDT", asset: "BTC"},…},…}
//   data: {
//     candleProps: ["close", "start"],
//     indicatorResults: true,
//     report: true,
//     roundtrips: true
//   }
// }
module.exports = function *() {
  var mode = 'backtest';

  var config = {};

  var base = require('./baseConfig');

  var req = this.request.body;

  _.merge(config, base, req.gekkoConfig);

  var result = yield pipelineRunner(mode, config);

  if(!req.data.report)
    delete result.report;

  if(!req.data.roundtrips)
    delete result.roundtrips;

  if(!req.data.indicatorResults)
    delete result.indicatorResults;

  if(!req.data.trades)
    delete result.trades;

  result.candles = _.map(
    result.candles,
    c => _.pick(c, req.data.candleProps)
  );

  this.body = result;
}