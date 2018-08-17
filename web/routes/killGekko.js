/*jshint esversion: 6 */
const _ = require('lodash');

const cache = require('../state/cache');
const broadcast = cache.get('broadcast');
const gekkoManager = cache.get('gekkos');
const gekkoProcessManager = cache.get('gekkoprocesses');

const base = require('./baseConfig');

// starts an import
// requires a post body with a config object
module.exports = function *() {

  let id = this.request.body.id;

  if(!id) {
    this.body = {
      status: 'not ok'
    }
    return;
  }

  var gekkoprocess = gekkoProcessManager.list().find((child) => child.id === id);
  
  gekkoprocess.disconnect(); //works!
  //gekko.kill(); kill not a function, dont know why!
  gekkoProcessManager.delete(id);
  
  let deleted = gekkoManager.delete(id);

  if(!deleted){
    this.body = {
      status: 'not ok'
    }
    return; 
  }

  broadcast({
    type: 'gekko_killed',
    gekko_id: id
  });

  this.body = {
    status: 'ok'
  };
}