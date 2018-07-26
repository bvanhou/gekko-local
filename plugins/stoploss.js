exports.trailingStopLoss = function(initPercentage, initTrailingStep) {

    let _percentage = (((100 - initPercentage)) / 100);
    let _initTrailingStep = (((100 - initTrailingStep)) / 100);;
    let _prevPrice = null;
    let _stopLoss = null;
    let _isActive = false;

    function initSettings(currentPrice) {
        _prevPrice = currentPrice;
        _stopLoss = _percentage * currentPrice;
        _isActive = true;
    };

    function initSettingsWithVariablePercentage(percentage, currentPrice) {
        _percentage = (((100 - percentage)) / 100);
        _prevPrice = currentPrice;
        _stopLoss = _percentage * currentPrice;
        _isActive = true;
    };

    function isTriggered(currentPrice) {
        if(_isActive)
           return (_stopLoss > currentPrice);
    }

    function calculateTrailingStopLoss(currentPrice) {
      const new_stoploss = _stopLoss + initTrailingStep * currentPrice;
      if (new_stoploss > currentPrice){
        _stopLoss = _percentage * currentPrice;
      }
    };


    function resetSettings() {
        _percentage, _prevPrice, _stopLoss = null;
        _isActive = false;
    };

    function printVariables() {
        return {
            percentage : _percentage,
            stoploss : _stopLoss,
            active : _isActive
        }
    };

    return {
        create: initSettings,
        destroy: resetSettings,
        update: calculateTrailingStopLoss,
        log : printVariables,
        isTriggered : isTriggered,
    }
};
/**
 * We use this module to keep track of candle history.
 */
exports.candleHistory = function() {
    var _limit = null;
    var _candles = [];

    var initialise = function(limit) {
        _limit = limit - 1;
    };

    var _canAdd = function() {
        return (_candles.length <= _limit);
    };

    var addCandleToarray = function(candle) {
        if (_canAdd())
            _candles.push(candle);
        else {
            _candles.shift();
            _candles.push(candle);
        }
    };

    var isFull = function() {
        return (_candles.length > _limit);
    };

    var getCurrentCandles = function() {
        return _candles;
    };

    var getCurrentSize = function() {
        return _candles.length;
    };

    return {
        init: initialise,
        add: addCandleToarray,
        get: getCurrentCandles,
        full: isFull,
        size: getCurrentSize
    }
};
