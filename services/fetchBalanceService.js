const Promise = require('bluebird'),
  ipc = require('node-ipc'),
  config = require('../config'),
  _ = require('lodash');

/**
 * @service
 * @description get balances for an address
 * @param address - registered address
 * @returns {Promise.<[{balances, lastBlockCheck}]>}
 */


module.exports = async address => {

  const ipcInstance = new ipc.IPC;

  Object.assign(ipcInstance.config, {
    id: Date.now(),
    socketRoot: config.bitcoin.ipcPath,
    retry: 1500,
    sync: true,
    silent: true,
    unlink: false,
    maxRetries: 3
  });

  await new Promise((res, rej) => {
    ipcInstance.connectTo(config.bitcoin.ipcName, () => {
      ipcInstance.of[config.bitcoin.ipcName].on('connect', res);
      ipcInstance.of[config.bitcoin.ipcName].on('error', rej);
    });
  });

  let rawCoins = await new Promise((res, rej) => {
    ipcInstance.of[config.bitcoin.ipcName].on('message', data => data.error ? rej(data.error) : res(data.result));
    ipcInstance.of[config.bitcoin.ipcName].emit('message', JSON.stringify({
        method: 'getcoinsbyaddress',
        params: [address]
      })
    );
  });

  let height = await new Promise((res, rej) => {
    ipcInstance.of[config.bitcoin.ipcName].on('message', data => data.error ? rej(data.error) : res(data.result));
    ipcInstance.of[config.bitcoin.ipcName].emit('message', JSON.stringify({
        method: 'getblockcount',
        params: []
      })
    );
  });

  ipcInstance.disconnect(config.bitcoin.ipcName);

  return {
    balance: _.chain(rawCoins)
      .map(coin => coin.value)
      .sum()
      .defaultTo(0)
      .value(),
    lastBlockCheck: height
  };

};
