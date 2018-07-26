// Everything is explained here:
// @link https://gekko.wizb.it/docs/commandline/plugins.html

var config = {};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                          GENERAL SETTINGS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

config.debug = true; // for additional logging / debugging

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                         WATCHING A MARKET
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

config.watch = {

  // see https://gekko.wizb.it/docs/introduction/supported_exchanges.html
  exchange: 'kraken',
  currency: 'EUR',
  asset: 'ETH',

  // You can set your own tickrate (refresh rate).
  // If you don't set it, the defaults are 2 sec for
  // okcoin and 20 sec for all other exchanges.
  // tickrate: 20
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING TRADING ADVICE
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

config.tradingAdvisor = {
  enabled: true,
  method: 'STC_STOCHASTIC',
  candleSize: 240,
  historySize: 30,
  stoploss : {
    enabled : false,
    procent : 10,
    trailingStep : 150
  }
}

config.STC_ZSchoro_orig = {  stc : { stcLength: 10, fastLength: 23, slowLength: 50, factor: 0.5} , threshold_high: 80, threshold_low: 20 }
config.STC_RJPGriffin = { stc : { stcLength: 10, fastLength: 23, slowLength: 50, factor: 0.5 } , thresholds: {high: 70, low: 30} }
config.STC_ZSchoro_mod_Griffin = { stc : {stcLength: 10, fastLength: 23, slowLength: 50, factor: 0.5 }, thresholds: {high: 70, low: 30} }



config.STC_STOCHASTIC = { stc   : {TCLen: 10, MA1Len: 23, MA2Len: 50, Factor: 0.5 , thresholds: {up: 51, down: 20} },
                          cci : {  parameters : {    optInTimePeriod : 150  },  thresholds : {  down : -70,    up : 70  }},

                          smaLong200 : {    parameters : {      optInTimePeriod : 200,    }},
                          smaMiddle80 : {  parameters : {      optInTimePeriod : 80,    }},
                          smaMiddle60 : {  parameters : {      optInTimePeriod : 60,    }},
                          smaMiddle40 : {  parameters : {      optInTimePeriod : 40,    }},
                          smaShort20 : {   parameters : {      optInTimePeriod : 20,    }},

                          // momentum : {   parameters : {      optInTimePeriod : 9,    }, thresholds : {  down : -20,    up : 35, buy: {down:-50}, cross_in_last_days: 3 }},
                          // momCci:150
                          momentum : {   parameters : {      optInTimePeriod : 6,    },
                               thresholds : {  down : -10,    up : 35, buy: {down:-23}, cross_in_last_days: 7 }}, //down : -115,    up : 35, buy: {down:-240},
                          roc : {   parameters : {      optInTimePeriod : 6,    },
                                    thresholds : {  down : -10,    up : 35, buy: {down:-23}, cross_in_last_days: 7 }}, //down : -115,    up : 35, buy: {down:-240},
                          stochasticTulip: { parameters : {optInFastKPeriod: 14, optInSlowKPeriod: 3, optInSlowDPeriod: 3},
                                             thresholds : {up: 80, buy: { strong_down: 40, weak_down: 40} ,
                                                                   sell: { down: 50} , cross_in_last_days: 11}},
                        }

config.multiple_timeframes = { stopBuffer : 0.015, profitRatio : 1.5, lowCross : -20, highCross : 20,
  macd: {  long: 26,    short: 12,    signal: 9,  },
  smaLong : {    parameters : {      optInTimePeriod : 100,    }},
  smaMiddle : {  parameters : {      optInTimePeriod : 21,    }},
  smaShort : {   parameters : {      optInTimePeriod : 7,    }},
 }

config.Threshold = {  ceiling : 600,  bottom : 470}

config['tulip-macd-cci'] = {
  macd : {
    parameters : {
      optInFastPeriod : 18,
      optInSlowPeriod : 21,
      optInSignalPeriod : 10
    },

    thresholds : {
      down : -0.96,
      up : 0.2
    }
  },

  cci : {
    parameters : {
      optInTimePeriod : 20,
      historySize : 30
    },

    thresholds : {
      down : -20,
      up : 70
    }
  }
}

config['tulip-macd-adx'] = {
  macd : {
    parameters : {
      optInFastPeriod : 18,
      optInSlowPeriod : 21,
      optInSignalPeriod : 10
    },

    thresholds : {
      down : -0.025,
      up : 0.025
    }
  },

  adx : {
    parameters : {
      optInTimePeriod : 20,
      historySize : 30,
      candleSize : 1440
    },

    thresholds : {
      down : 20,
      up : 25
    }
  }
}

config['tulip-macd'] = {

  parameters : {
    optInFastPeriod : 18,
    optInSlowPeriod : 21,
    optInSignalPeriod : 10
  },

  thresholds : {
    down : -0.025,
    up : 0.025
  }
}

config['tulip-cci-daily'] = {
  cci: {    parameters : {      optInTimePeriod : 20,    },
    thresholds : {      up : 56,      down : -20,    }
  }
}

config['tulip-cci-bear-daily'] = {
  cci: {
    parameters : {
      optInTimePeriod : 32,
    },

    thresholds : {
      up : 20,
      down : -65,
    }
  },

  smaLong : {    parameters : {      optInTimePeriod : 100}},
  smaMiddle : {    parameters : {      optInTimePeriod : 30}},
  smaShort : {    parameters : {      optInTimePeriod : 7}},
}

config['tulip-cci'] = {
  cci: {    parameters : {      optInTimePeriod : 20,    },
    thresholds : {      up_extreme : 170,      up : 70,      down : -20,    }
  },
  adx : {    parameters : {      optInTimePeriod : 20,    },
    thresholds : {      up : 22,      down : 20    }  },
  aroonosc : {
    parameters : {
      optInTimePeriod : 20,
    },
    thresholds : {
      up : 60,
      down : 20
    }
  },

  smaLong : {    parameters : {      optInTimePeriod : 100,    }},
  smaMiddle : {    parameters : {      optInTimePeriod : 21,    }},
  smaShort : {    parameters : {      optInTimePeriod : 7,    }},
}

// CCI Settings
config.CCI = {
    cci : {
      parameters : {      optInTimePeriod : 20,    },
      thresholds: {
        up: 70, // fixed values for overbuy upward trajectory
        down: -20, // fixed value for downward trajectory
        persistence: 0, // filter spikes by adding extra filters candles
        up_extreme: 170
      },
    },
    smaLong : {    parameters : {      optInTimePeriod : 100,    }},
    smaMiddle : {  parameters : {      optInTimePeriod : 21,    }},
    smaShort : {   parameters : {      optInTimePeriod : 7,    }},
};

config['tulip-cci-bear'] = {
  cci : {   parameters : {      optInTimePeriod : 20,    },
            thresholds : {
              up : 20,
              down : -70,
              down_extreme : -170,
            }
  },
  smaLong : {    parameters : {      optInTimePeriod : 200,    }},
  smaMiddle : {    parameters : {      optInTimePeriod : 15,    }},
  smaShort : {    parameters : {      optInTimePeriod : 7,    }},

  aroonosc : {
    parameters : {
      optInTimePeriod : 20,
    },
    thresholds : {
      up : 10,
      down : -10
    }
  },
  adx : {
    parameters : {
      optInTimePeriod : 20,
    },

    thresholds : {
      up : 22,
      down : 20
    }
  },
}

config.RSI_BULL_BEAR ={
 SMA_long : 1000,
 SMA_short : 50,

 BULL_RSI : 10,
 BULL_RSI_high : 80,
 BULL_RSI_low : 60,

 BEAR_RSI : 15,
 BEAR_RSI_high : 50,
 BEAR_RSI_low : 20,
}

config.RSI_BULL_BEAR_ADX = {
  SMA : {long : 1000,  short : 50},
  BULL : {  rsi : 10,  high : 80,  low : 60,  mod_high : 5,  mod_low : -5},
  BEAR : {  rsi : 15,  high : 50,  low : 20,  mod_high : 15, mod_low  : -5},
  ADX : {  adx : 3,  high : 70,  low : 50}
}

config.TEMA = {
short : 10,
long : 80,

SMA_long : 200
}

config.neuralnet_v2 = {
  threshold_buy : 1.0,
  threshold_sell : -1.0,

  learning_rate : 0.01,
  momentum : 0.1,
  decay : 0.01,
  stoploss_enabled : false,
  stoploss_threshold : 0.85,
  hodl_threshold : 1,
  price_buffer_len : 100,
  min_predictions : 1000
}
// Exponential Moving Averages settings:
config.DEMA = {
  // EMA weight (α)
  // the higher the weight, the more smooth (and delayed) the line
  weight: 21,
  // amount of candles to remember and base initial EMAs on
  // the difference between the EMAs (to act as triggers)
  thresholds: {
    down: -0.025,
    up: 0.025
  }
};

// MACD settings:
config.MACD = {
  // EMA weight (α)
  // the higher the weight, the more smooth (and delayed) the line
  short: 18,
  long: 21,
  signal: 10,
  // the difference between the EMAs (to act as triggers)
  thresholds: {
    down: -0.015,
    up: 0.045,
    // How many candle intervals should a trend persist
    // before we consider it real?
    persistence: 1
  }
};

// PPO settings:
config.PPO = {
  // EMA weight (α)
  // the higher the weight, the more smooth (and delayed) the line
  short: 12,
  long: 26,
  signal: 9,
  // the difference between the EMAs (to act as triggers)
  thresholds: {
    down: -0.025,
    up: 0.025,
    // How many candle intervals should a trend persist
    // before we consider it real?
    persistence: 2
  }
};

// Uses one of the momentum indicators but adjusts the thresholds when PPO is bullish or bearish
// Uses settings from the ppo and momentum indicator config block
config.varPPO = {
  momentum: 'TSI', // RSI, TSI or UO
  thresholds: {
    // new threshold is default threshold + PPOhist * PPOweight
    weightLow: 120,
    weightHigh: -120,
    // How many candle intervals should a trend persist
    // before we consider it real?
    persistence: 0
  }
};

// RSI settings:
config.RSI = {
  interval: 14,
  parameters : {
    optInTimePeriod: 20
  },
  thresholds: {
    low: 30,
    high: 55,
    // How many candle intervals should a trend persist
    // before we consider it real?
    persistence: 1
  }
};

// TSI settings:
config.TSI = {
  short: 13,
  long: 25,
  thresholds: {
    low: -25,
    high: 25,
    // How many candle intervals should a trend persist
    // before we consider it real?
    persistence: 1
  }
};

// Ultimate Oscillator Settings
config.UO = {
  first: {weight: 4, period: 7},
  second: {weight: 2, period: 14},
  third: {weight: 1, period: 28},
  thresholds: {
    low: 30,
    high: 70,
    // How many candle intervals should a trend persist
    // before we consider it real?
    persistence: 1
  }
};

// StochRSI settings
config.StochRSI = {
  interval: 3,
  thresholds: {
    low: 20,
    high: 80,
    // How many candle intervals should a trend persist
    // before we consider it real?
    persistence: 3
  }
};

// TMA tripple Moving average
config.TMA = {
  short :7,
  medium : 25,
  long :99
};

// custom settings:
config.custom = {
  my_custom_setting: 10,
}

config['talib-macd'] = {
  parameters: {
    optInFastPeriod: 10,
    optInSlowPeriod: 21,
    optInSignalPeriod: 9
  },
  thresholds: {
    down: -0.025,
    up: 0.025,
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING PLUGINS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// do you want Gekko to simulate the profit of the strategy's own advice?
config.paperTrader = {
  enabled: true,
  // report the profit in the currency or the asset?
  reportInCurrency: true,
  // start balance, on what the current balance is compared with
  simulationBalance: {
    // these are in the unit types configured in the watcher.
    asset: 0,
    currency: 10000,
  },
  // how much fee in % does each trade cost?
  feeMaker: 0.05,
  feeTaker: 0.25,
  feeUsing: 'maker',
  // how much slippage/spread should Gekko assume per trade?
  slippage: 0.05,
}

config.performanceAnalyzer = {
  enabled: true,
  riskFreeReturn: 5
}

// Want Gekko to perform real trades on buy or sell advice?
// Enabling this will activate trades for the market being
// watched by `config.watch`.
config.trader = {
  enabled: false,
  key: '',
  secret: '',
  username: '', // your username, only required for specific exchanges.
  passphrase: '', // GDAX, requires a passphrase.
  orderUpdateDelay: 1, // Number of minutes to adjust unfilled order prices
}

config.adviceLogger = {
  enabled: false,
  muteSoft: true // disable advice printout if it's soft
}

config.pushover = {
  enabled: false,
  sendPushoverOnStart: false,
  muteSoft: true, // disable advice printout if it's soft
  tag: '[GEKKO]',
  key: '',
  user: ''
}

// want Gekko to send a mail on buy or sell advice?
config.mailer = {
  enabled: false,       // Send Emails if true, false to turn off
  sendMailOnStart: true,    // Send 'Gekko starting' message if true, not if false

  email: '',    // Your Gmail address
  muteSoft: true, // disable advice printout if it's soft

  // You don't have to set your password here, if you leave it blank we will ask it
  // when Gekko's starts.
  //
  // NOTE: Gekko is an open source project < https://github.com/askmike/gekko >,
  // make sure you looked at the code or trust the maintainer of this bot when you
  // fill in your email and password.
  //
  // WARNING: If you have NOT downloaded Gekko from the github page above we CANNOT
  // guarantuee that your email address & password are safe!

  password: '',       // Your Gmail Password - if not supplied Gekko will prompt on startup.

  tag: '[GEKKO] ',      // Prefix all email subject lines with this

            //       ADVANCED MAIL SETTINGS
            // you can leave those as is if you
            // just want to use Gmail

  server: 'smtp.gmail.com',   // The name of YOUR outbound (SMTP) mail server.
  smtpauth: true,     // Does SMTP server require authentication (true for Gmail)
          // The following 3 values default to the Email (above) if left blank
  user: '',       // Your Email server user name - usually your full Email address 'me@mydomain.com'
  from: '',       // 'me@mydomain.com'
  to: '',       // 'me@somedomain.com, me@someotherdomain.com'
  ssl: true,        // Use SSL (true for Gmail)
  port: '',       // Set if you don't want to use the default port
}

config.pushbullet = {
    // sends pushbullets if true
  enabled: false,
    // Send 'Gekko starting' message if true
  sendMessageOnStart: true,
    // disable advice printout if it's soft
  muteSoft: true,
    // your pushbullet API key
  key: 'xxx',
    // your email, change it unless you are Azor Ahai
  email: 'jon_snow@westeros.org',
    // will make Gekko messages start mit [GEKKO]
  tag: '[GEKKO]'
};

config.kodi = {
  // if you have a username & pass, add it like below
  // http://user:pass@ip-or-hostname:8080/jsonrpc
  host: 'http://ip-or-hostname:8080/jsonrpc',
  enabled: false,
  sendMessageOnStart: true,
}

config.ircbot = {
  enabled: false,
  emitUpdates: false,
  muteSoft: true,
  channel: '#your-channel',
  server: 'irc.freenode.net',
  botName: 'gekkobot'
}

config.telegrambot = {
  enabled: false,
  token: 'YOUR_TELEGRAM_BOT_TOKEN',
};

config.twitter = {
    // sends pushbullets if true
  enabled: false,
    // Send 'Gekko starting' message if true
  sendMessageOnStart: false,
    // disable advice printout if it's soft
  muteSoft: false,
  tag: '[GEKKO]',
    // twitter consumer key
  consumer_key: '',
    // twitter consumer secret
  consumer_secret: '',
    // twitter access token key
  access_token_key: '',
    // twitter access token secret
  access_token_secret: ''
};

config.xmppbot = {
  enabled: false,
  emitUpdates: false,
  client_id: 'jabber_id',
  client_pwd: 'jabber_pw',
  client_host: 'jabber_server',
  client_port: 5222,
  status_msg: 'I\'m online',
  receiver: 'jabber_id_for_updates'
}

config.campfire = {
  enabled: false,
  emitUpdates: false,
  nickname: 'Gordon',
  roomId: null,
  apiKey: '',
  account: ''
}

config.redisBeacon = {
  enabled: false,
  port: 6379, // redis default
  host: '127.0.0.1', // localhost
    // On default Gekko broadcasts
    // events in the channel with
    // the name of the event, set
    // an optional prefix to the
    // channel name.
  channelPrefix: '',
  broadcast: [
    'candle'
  ]
}

config.slack = {
  enabled: false,
  token: '',
  sendMessageOnStart: true,
  muteSoft: true,
  channel: '' // #tradebot
}

config.ifttt = {
  enabled: false,
  eventName: 'gekko',
  makerKey: '',
  muteSoft: true,
  sendMessageOnStart: true
}

config.candleWriter = {
  enabled: true
}

config.adviceWriter = {
  enabled: false,
  muteSoft: true,
}

config.rabbitmq = {
  enabled: false
}

config.nodeipc = {
  enabled: true,
  serverpath: '/tmp/tradingbot.myipcserver',
  connectionid: 'tradingbot',
  enableProcessCandle: true,
  enableProcessAdvice: true
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING ADAPTER
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

config.adapter = 'sqlite';

config.sqlite = {
  path: 'plugins/sqlite',

  dataDirectory: 'history',
  version: 0.1,

  journalMode: require('./web/isWindows.js') ? 'DELETE' : 'WAL',

  dependencies: []
}

  // Postgres adapter example config (please note: requires postgres >= 9.5):
config.postgresql = {
  path: 'plugins/postgresql',
  version: 0.1,
  connectionString: 'postgres://user:pass@localhost:5432', // if default port
  database: null, // if set, we'll put all tables into a single database.
  schema: 'public',
  dependencies: [{
    module: 'pg',
    version: '6.1.0'
  }]
}

// Mongodb adapter, requires mongodb >= 3.3 (no version earlier tested)
config.mongodb = {
  path: 'plugins/mongodb',
  version: 0.1,
  connectionString: 'mongodb://localhost/gekko', // connection to mongodb server
  dependencies: [{
    module: 'mongojs',
    version: '2.4.0'
  }]
}

config.importer = {
  daterange: {
    // NOTE: these dates are in UTC
    from: "2017-01-01 00:00:00",
    to: "2018-06-20 00:00:00"
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING BACKTESTING
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Note that these settings are only used in backtesting mode, see here:
// @link: https://gekko.wizb.it/docs/commandline/backtesting.html

config.backtest = {
//  daterange: 'scan',
 daterange: {
   from: "2017-01-01 00:00:00",
   to: "2018-06-02 00:00:00"
},
  batchSize: 1000
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//                       CONFIGURING IMPORTING
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// set this to true if you understand that Gekko will
// invest according to how you configured the indicators.
// None of the advice in the output is Gekko telling you
// to take a certain position. Instead it is the result
// of running the indicators you configured automatically.
//
// In other words: Gekko automates your trading strategies,
// it doesn't advice on itself, only set to true if you truly
// understand this.
//
// Not sure? Read this first: https://github.com/askmike/gekko/issues/201
config['I understand that Gekko only automates MY OWN trading strategies'] = false;

module.exports = config;
