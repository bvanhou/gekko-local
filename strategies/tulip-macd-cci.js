var _ = require('lodash');
var log = require('../core/log.js');

var method = {};
method.init = function() {
    // strat name
    this.name = 'tulip-multi-strat';
    // trend information
    this.trend = 'none'
    // tulip indicators use this sometimes
    // this.requiredHistory = this.settings.cci.parameters.historySize;
    // define the indicators we need
    let customSettings = this.settings.cci.parameters;
    customSettings.optInTimePeriod =  Number(customSettings.optInTimePeriod);
    this.addTulipIndicator('mycci', 'cci', customSettings);
    this.addTulipIndicator('mymacd', 'macd', this.settings.macd.parameters);

    log.info(this.settings.macd.parameters)
    log.info(this.settings.cci.parameters)
}

// what happens on every new candle?
method.update = function(candle) {
    // tulip results
    this.cci = this.tulipIndicators.mycci.result.result;
    this.macd = this.tulipIndicators.mymacd.result.macdHistogram;
}
// for debugging purposes log the last
// calculated parameters.
method.log = function() {
  /*
    log.debug(
`---------------------
Tulip cci: ${this.cci}
Tulip MACD: ${this.macd}
`);
*/
}

method.check = function(candle) {

  let my_all_long = false;
  let my_all_short = false;
    if (this.cci > Number(this.settings.cci.thresholds.up) && this.trend!=='long'){
      //log.debug(`we have a trend !!!!`);
      if (this.macd > Number(this.settings.macd.thresholds.up) && this.trend!=='long'){
        //log.debug(`we have a long trend ()`);
        my_all_long = true;
      }
    }

    //all_my_short = this.macd< this.settings.macd.thresholds.down && this.trend!=='short';
    all_my_short =  this.macd< Number(this.settings.macd.thresholds.down) && this.trend!=='short';

    // just add a long and short to each array when new indicators are used
    const all_long = [
        this.cci > Number(this.settings.cci.thresholds.up) && this.trend!=='long',
        this.macd > Number(this.settings.macd.thresholds.up) && this.trend!=='long',
    ].reduce((total, long)=>long && total, true);

    const all_short =  this.macd< Number(this.settings.macd.thresholds.down) && this.trend!=='short';

    if (my_all_long !== all_long){
      log.debug('long mismatch: '+ my_all_long + ' '+all_long + ' '+this.cci);
    }

    if (all_my_short !== all_short){
      log.debug('short mismatch: '+ all_my_short + ' '+all_short + ' '+this.cci);
    }

    // combining all indicators with AND
    if(my_all_long){
        this.advice('long');
    }else if(all_my_short){
        this.advice('short');
    }else{
        this.advice();
    }

}

module.exports = method;
