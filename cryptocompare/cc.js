const io = require('socket.io-client');
const CCC = require('./ccc-streamer-utilities');
const ipc = require ('node-ipc');

const streamUrl = "https://streamer.cryptocompare.com/";

let pairMap = new Map();

function getCcSubsriptions(){
  const fetch = require ('node-fetch');

  return new Promise((resolve, reject) => {
    var fsymCc = "BTC";
    var tsymCc = "USD";
    var currentSubs;
    var currentSubsText = "";
    var dataUrl = "https://min-api.cryptocompare.com/data/subs?fsym=" + fsymCc + "&tsyms=" + tsymCc;

    fetch(dataUrl)
    .then(response => resolve(response.json()))
    .catch((error) => {
      console.log('Cryptocompare API not available.');
      reject(`Cryptocompare API not available.Error: ${error}`);
    });
  });
}

function subscribeToAllExchanges(){
  getCcSubsriptions().then((data) => {
    //console.log(data);
  	currentSubs = data['USD']['TRADES'];
  	console.log(currentSubs);

  });
}

// flag: 0 = get TRADES
// Use SubscriptionId 0 for TRADE, 2 for CURRENT, 5 for CURRENTAGG eg use key '5~CCCAGG~BTC~USD' to get aggregated data from the CCCAGG exchange
function subscribeToTrades(flag, asset, currency, exchange){
  // myCurrentSubs1 = '0~Kraken~BTC~EUR';
  // myCurrentSubs2 = '0~Kraken~ETH~EUR';
  if (asset == 'XBT')
    asset = 'BTC';
  if (currency == 'XBT')
    currency = 'BTC';
  return flag+'~'+exchange+'~'+asset+'~'+currency;
}


/*
capabilities : {
  name: 'Kraken',
  slug: 'kraken',
  currencies: marketData.currencies,
  assets: marketData.assets,
  markets: marketData.markets,
  requires: ['key', 'secret'],
  providesHistory: 'date',
  providesFullHistory: true,
  tid: 'date',
  tradable: true
};
*/
function listenToWebsocket(capabilities){
  let socket = io(streamUrl, { transports: ['websocket']});
  socket.on('connect', function(){
    var subs = [];
    console.log("we are connected");
    createServer('cryptocompare', 'myipcserver').then(()=> {

    // get all tradeable pairs for exchange, not works! better match assets to currencies
    // for (let market of capabilities.markets){
    //  subs.push(subscribeToTrades(market.pair[0], market.pair[1], 'Kraken'));
    // }
    for (let asset of capabilities.assets){
      for (let currency of capabilities.currencies){
        if (asset !== 'XDG') { // kein Dodge coin for now, cc find no trades!
          subs.push(subscribeToTrades(0,asset, currency, 'Kraken'));
        }
      }
    }
    //subs.push(subscribeToTrades(0,'ETH', 'EUR', 'Kraken'));
    socket.emit('SubAdd', { subs: subs });
    })
  });

  const promise = new Promise((resolve, reject)=> {
    socket.on('m', function(currentData) {
    	var tradeField = currentData.substr(0, currentData.indexOf("~"));
      let newTrade;
      if (tradeField == CCC.STATIC.TYPE.CURRENT) {
        newTrade = transformCurrentData(currentData);
      }else
    	if (tradeField == CCC.STATIC.TYPE.TRADE) {
    	 	newTrade = transformTradeData(currentData);
    	}

      if (newTrade && newTrade.price){
        const key = newTrade.asset + newTrade.currency+  newTrade.exchange;
        //console.log("set map: " + key.toUpperCase());
        pairMap.set(key.toUpperCase(), newTrade);
        broadcast(newTrade);
      }
      resolve(undefined);
    });
  })

  socket.on('error', (error) => {
    console.log(error);
  });

  return promise;
}

function getPairsMap(){
  return pairMap;
}

function transformTradeData(data) {
	var incomingTrade = CCC.TRADE.unpack(data);
  //console.log(incomingTrade);
  let fsym = incomingTrade['FSYM'];
  let tsym = incomingTrade['TSYM'];
  var coinfsym = CCC.STATIC.CURRENCY.getSymbol(fsym);
  var cointsym = CCC.STATIC.CURRENCY.getSymbol(tsym);

	var newTrade = {
    asset: fsym,
    currency: tsym,
		exchange: incomingTrade['M'],
		type: incomingTrade['T'],
		id: incomingTrade['ID'],
		//Price: CCC.convertValueToDisplay(cointsym, incomingTrade['P']),
		price: incomingTrade['P'],
		quantity: incomingTrade['Q'],
		total: incomingTrade['TOTAL']
	};

	// if (incomingTrade['F'] & 1) {
	// 	newTrade['Type'] = "SELL";
	// }
	// else if (incomingTrade['F'] & 2) {
	// 	newTrade['Type'] = "BUY";
	// }
	// else {
	// 	newTrade['Type'] = "UNKNOWN";
	// }

  return newTrade;
};

function transformCurrentData(data) {
	var incomingTrade = CCC.CURRENT.unpack(data);
  let fsym = incomingTrade['FROMSYMBOL'];
  let tsym = incomingTrade['TOSYMBOL'];

	var newTrade = {
    asset: fsym,
    currency: tsym,
		exchange: incomingTrade['MARKET'],
		type: incomingTrade['FLAGS'],
		id: incomingTrade['LASTTRADEID'],
		price: incomingTrade['PRICE'],
		quantity: incomingTrade['LASTVOLUME'],
		total: incomingTrade['LASTVOLUME']
	};

  return newTrade;
};


function createServer(connectionid, serverpath) {
  ipc.config.id = connectionid;
  ipc.config.retry= 1500;
  ipc.config.silent= true;

  const promise = new Promise((resolve, reject) => {
    ipc.serve(serverpath, ()=> {
      resolve(true);
    })

  })
  ipc.server.start();

  return promise;
}

function broadcast(data) {
  ipc.server.broadcast('quota', data);
}

module.exports = {
    listenToWebsocket,
    getPairsMap
};
