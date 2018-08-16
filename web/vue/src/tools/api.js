// global window.CONFIG

const config = window.CONFIG.api;
const host = `${config.host}${config.path}api/`;

// rest API path
if(config.ssl) {
  var restPath = `${config.path}api/`;
} else {
  var restPath = `${config.path}api/`;
}

// ws API path
if(config.ssl) {
  var wsPath = `wss://${host}`;
} else {
  var wsPath = `ws://${host}`;
}


export {wsPath,restPath};
