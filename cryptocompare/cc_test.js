const io = require('socket.io-client');
const CCC = require('./ccc-streamer-utilities');
const ipc = require ('node-ipc');
const moment = require('moment');

const streamUrl = "https://streamer.cryptocompare.com/";

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


function listenToWebsocket(){

  let socket = io(streamUrl, { transports: ['websocket']});
  socket.on('connect', function(){
    console.log("we are connected");
    let subs = [];
    subs.push(subscribeToTrades(0,'ETH', 'EUR', 'Kraken'));

    socket.emit('SubAdd', { subs: subs });
  });

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
        const ts = moment.unix(newTrade.timestamp)
        console.log("cc got " + newTrade.asset + ' ' + newTrade.currency+ ' '+ newTrade.exchange + ' '+ ts.utc().format());
      }
  })
  socket.on('connect_error', (error) => {
    console.log(error);
  });


  socket.on('error', (error) => {
    console.log(error);
  });
}

listenToWebsocket();

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
		timestamp: incomingTrade['TS'],
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

	var newCurrent = {
    asset: fsym,
    currency: tsym,
		exchange: incomingTrade['MARKET'],
		type: incomingTrade['FLAGS'],
		id: incomingTrade['LASTTRADEID'],
    timestamp: ((new Date().getTime())/1000), //or better utc?
		price: incomingTrade['PRICE'],
		quantity: incomingTrade['LASTVOLUME'],
		total: incomingTrade['LASTVOLUME']
	};

  return newCurrent;
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

module.exports = {
    listenToWebsocket
};
