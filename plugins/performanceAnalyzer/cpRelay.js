// relay paper trade results using cp

const _ = require('lodash');
const moment = require('moment');

const util = require('../../core/util.js');
const dirs = util.dirs();
const mode = util.gekkoMode();
const log = require(dirs.core + 'log');
const cp = require(dirs.core + 'cp');

const Relay = function(watchConfig) {
  this.currency = watchConfig.currency;
  this.asset = watchConfig.asset;

  this.roundtrips = [];
}

Relay.prototype.handleTrade = function(trade, report) {
  cp.trade(trade);
  cp.report(report);

  if (this.logHandleTrade){
    this.logHandleTrade(trade, report);
  }
}

Relay.prototype.handleRoundtrip = function(rt) {
  cp.roundtrip(rt);
  this.logHandleRoundtrip();
}

Relay.prototype.finalize = function(report) {
  cp.report(report);
}


if(mode === 'backtest') {
  //Relay.prototype.handleTrade = Relay.prototype.logReport;
  // we only want to log a summarized one line report, like:
  // 2016-12-19 20:12:00: Paper trader simulated a BUY 0.000 USDT => 1.098 BTC
  Relay.prototype.logHandleTrade = function(trade, roundtripProfit) {
    if(trade.action !== 'sell' && trade.action !== 'buy' && trade.action !== 'sell bear' && trade.action !== 'buy bear')
      return;

    var at = trade.date.format('YYYY-MM-DD HH:mm:ss');


    if(trade.action === 'sell' || trade.action === 'sell bear'){

        log.info(
          `${at}: Paper trader simulated a ${trade.action}`,
          `\t${trade.portfolio.currency.toFixed(2)}`,
          `${this.currency} <= ${trade.portfolio.asset.toFixed(2)}`,
          `${this.asset}`,
          `\t${roundtripProfit.toFixed(2)}`
        );
    }
    else if(trade.action === 'buy' || trade.action === 'buy bear')

      log.info(
        `${at}: Paper trader simulated a ${trade.action}`,
        `\t${trade.portfolio.currency.toFixed(2)}`,
        `${this.currency}\t=> ${trade.portfolio.asset.toFixed(2)}`,
        `${this.asset}`
      );
  }

  Relay.prototype.logHandleRoundtrip = function(rt) {
    this.roundtrips.push(rt);
  }

}


module.exports = Relay;