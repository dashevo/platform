const Dash = require('dash');

const { contractId } = require('@dashevo/dpns-contract/lib/systemIds');

const getDAPISeeds = require('./getDAPISeeds');

let faucetClient;

function createFaucetClient() {
  if (faucetClient) {
    return faucetClient;
  }

  const seeds = getDAPISeeds();

  const clientOpts = {
    // seeds,
    dapiAddresses: [
      '34.210.237.116',
      '54.69.65.231',
      // '54.185.90.95',
      // '54.186.234.0',
      // '35.87.212.139',
      // '34.212.52.44',
      '34.217.47.197',
      '34.220.79.131',
      '18.237.212.176',
      '54.188.17.188',
      '34.210.1.159',
    ],
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
