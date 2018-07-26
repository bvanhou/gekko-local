var _ = require('lodash');
var log = require('../core/log.js');

var method = {};
method.init = function() {
    // strat name
    this.name = 'tulip-multi-strat';
    // trend information
    this.trend = 'none'
    // tulip indicators use this sometimes
    this.requiredHistory = this.settings.adx.parameters.historySize;
    // define the indicators we need
    this.addTulipIndicator('myadx', 'adx', this.settings.adx.parameters);
    this.addTulipIndicator('mymacd', 'macd', this.settings.macd.parameters);

    log.info(this.settings.macd.parameters)
    log.info(this.settings.adx.parameters)
}

// what happens on every new candle?
method.update = function(candle) {
    // tulip results
    this.adx = this.tulipIndicators.myadx.result.result;
    this.macd = this.tulipIndicators.mymacd.result.macdHistogram;
}
// for debugging purposes log the last
// calculated parameters.
method.log = function() {
  /*
    log.debug(
`---------------------
Tulip ADX: ${this.adx}
Tulip MACD: ${this.macd}
`);
*/
}

method.check = function(candle) {

  let my_all_long = false;
  let my_all_short = false;
    if (this.adx > this.settings.adx.thresholds.up && this.trend!=='long'){
      //log.debug(`we have a trend !!!!`);
      if (this.macd > this.settings.macd.thresholds.up && this.trend!=='long'){
        //log.debug(`we have a long trend ()`);
        my_all_long = true;
      }
    }

    //all_my_short = this.macd< this.settings.macd.thresholds.down && this.trend!=='short';
    all_my_short =  this.macd< this.settings.macd.thresholds.down && this.trend!=='short';

    // just add a long and short to each array when new indicators are used
    const all_long = [
        this.adx > this.settings.adx.thresholds.up && this.trend!=='long',
        this.macd > this.settings.macd.thresholds.up && this.trend!=='long',
    ].reduce((total, long)=>long && total, true);

    const all_short =  this.macd< this.settings.macd.thresholds.down && this.trend!=='short';

    if (my_all_long !== all_long){
      log.debug('long mismatch: '+ my_all_long + ' '+all_long + ' '+this.adx);
    }

    if (all_my_short !== all_short){
      log.debug('short mismatch: '+ all_my_short + ' '+all_short + ' '+this.adx);
    }

    // combining all indicators with AND
    if(my_all_long){
      //  log.debug(`tulip-multi-strat In low`);
        this.advice('long');
    }else if(all_my_short){
      //  log.debug(`tulip-multi-strat In high`);
        this.advice('short');
    }else{
      //  log.debug(`tulip-multi-strat In no trend`);
        this.advice();
    }

}

module.exports = method;
