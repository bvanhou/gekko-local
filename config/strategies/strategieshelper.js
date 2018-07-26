var prepareForTulip = function(config){
  config.optInTimePeriod = Number (config.optInTimePeriod)

  return config;
}

var crossLong = function(prev1, prev2, current1, current2){
  return prev1<prev2 && current1 > current2;
}

var crossShort = function(prev1, prev2, current1, current2){
  return prev1>prev2 && current1 < current2;
}

module.exports = {prepareForTulip, crossLong, crossShort}
