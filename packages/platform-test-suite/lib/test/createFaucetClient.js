const Dash = require('dash');
const { NodeForage } = require('nodeforage');
const LocalForage = require('localforage');
const path = require('path');

const { contractId } = require('@dashevo/dpns-contract/lib/systemIds');

const getDAPISeeds = require('./getDAPISeeds');

let faucetClient;

function createFaucetClient() {
  const seeds = getDAPISeeds();

  const clientOpts = {
    seeds,
    network: process.env.NETWORK,
    apps: {
      dpns: {
        contractId,
      },
    },
  };

  const walletOptions = {
    privateKey: process.env.FAUCET_PRIVATE_KEY,
  };

  if (process.env.FAUCET_WALLET_USE_STORAGE === 'true') {
    if (typeof window === 'undefined') {
      walletOptions.adapter = new NodeForage({
        name: path.join(process.env.FAUCET_STORAGE_DIR,
          `faucet-wallet-${process.env.FAUCET_ADDRESS}`),
      });
    } else {
      walletOptions.adapter = LocalForage;
    }
  }

  if (process.env.SKIP_SYNC_BEFORE_HEIGHT) {
    walletOptions.unsafeOptions = {
      skipSynchronizationBeforeHeight: process.env.SKIP_SYNC_BEFORE_HEIGHT,
    };
  }

  faucetClient = new Dash.Client({
    ...clientOpts,
    wallet: walletOptions,
  });

  return faucetClient;
}

module.exports = createFaucetClient;
