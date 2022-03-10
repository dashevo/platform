const DAPIClient = require('@dashevo/dapi-client');
const {
  Block,
  BlockHeader,
  PrivateKey,
  ChainLock,
} = require('@dashevo/dashcore-lib');

const getDAPISeeds = require('../../../lib/test/getDAPISeeds');
const createFaucetClient = require('../../../lib/test/createFaucetClient');

const wait = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

describe('subscribeToBlockHeadersWithChainLocksHandlerFactory', () => {
  let dapiClient;
  const network = process.env.NETWORK;

  let bestBlock;
  let bestBlockHeight;

  beforeEach(async () => {
    dapiClient = new DAPIClient({
      network,
      seeds: getDAPISeeds(),
    });

    const bestBlockHash = await dapiClient.core.getBestBlockHash();
    bestBlock = new Block(
      await dapiClient.core.getBlockByHash(bestBlockHash),
    );
    bestBlockHeight = bestBlock.transactions[0].extraPayload.height;
  });

  it('should respond with only historical data', async () => {
    const headersAmount = 10;
    const historicalBlockHeaders = [];
    let bestChainLock = null;

    const stream = await dapiClient.core.subscribeToBlockHeadersWithChainLocks({
      fromBlockHeight: 1,
      count: headersAmount,
    });

    stream.on('data', (data) => {
      const blockHeaders = data.getBlockHeaders();

      if (blockHeaders) {
        blockHeaders.getHeadersList().forEach((header) => {
          historicalBlockHeaders.push(new BlockHeader(Buffer.from(header, 'hex')));
        });
      }

      const rawChainLock = data.getChainLock();

      if (rawChainLock) {
        bestChainLock = new ChainLock(Buffer.from(rawChainLock));
      }
    });

    let streamEnded = false;

    stream.on('end', () => {
      streamEnded = true;
    });

    let streamError;
    stream.on('error', (e) => {
      streamError = e;
    });

    while (!streamEnded) {
      if (streamError) {
        throw streamError;
      }
      await wait(1000);
    }

    expect(streamEnded).to.be.true();

    // TODO: fetching blocks one by one takes too long. Implement getBlockHeaders in dapi-client
    const fetchedBlocks = []

    for (let i = 1; i <= headersAmount; i++) {
      const rawBlock = await dapiClient.core.getBlockByHeight(i)
      const block = new Block(rawBlock)

      fetchedBlocks.push(block)
    }

    expect(historicalBlockHeaders.map((header) => header.hash))
      .to.deep.equal(fetchedBlocks.map((block) => block.header.hash));
    expect(bestChainLock.height).to.exist();
  });

  it('should respond with both new and historical data', async () => {
    let latestChainLock = null;

    const historicalBlocksToGet = 10;
    const blockHeadersHashesFromStream = [];

    let obtainedFreshBlock = false;

    const faucetClient = createFaucetClient();
    const faucetWalletAccount = await faucetClient.getWalletAccount();

    // Connect to the stream
    const stream = await dapiClient.core.subscribeToBlockHeadersWithChainLocks(
      {
        fromBlockHeight: bestBlockHeight - historicalBlocksToGet + 1,
      },
    );

    let streamEnded = false;
    stream.on('data', (data) => {
      const blockHeaders = data.getBlockHeaders();

      if (blockHeaders) {
        const list = blockHeaders.getHeadersList();
        list.forEach((headerBytes) => {
          const header = new BlockHeader(Buffer.from(headerBytes));
          blockHeadersHashesFromStream.push(header.hash);

          // Once we've obtained a required amount of historical blocks,
          // we can consider the rest arriving as newly generated
          if (blockHeadersHashesFromStream.length > historicalBlocksToGet) {
            obtainedFreshBlock = true;
          }
        });
      }

      if (obtainedFreshBlock) {
        const rawChainLock = data.getChainLock();
        if (rawChainLock) {
          latestChainLock = new ChainLock(Buffer.from(rawChainLock));
          console.log('rawchainlockddd', latestChainLock)
          stream.cancel();
          streamEnded = true;
        }
      }
    });

    let streamError;
    stream.on('error', (e, e1) => {
      console.error(e, e1)
      streamError = e;
    });

    stream.on('end', () => {
      console.log('stream ended')
      streamEnded = true;
    });

    console.log('before create transaction')

    // Create and broadcast transaction to produce fresh block
    const transaction = faucetWalletAccount.createTransaction({
      recipient: new PrivateKey().toAddress(process.env.NETWORK),
      satoshis: 10000,
    });

    await dapiClient.core.broadcastTransaction(transaction.toBuffer());
    // Wait for stream ending
    while (!streamEnded) {
      if (streamError) {
        console.error(streamError.stack)
        throw streamError;
      }

      await wait(1000);
    }

    // TODO: fetching blocks one by one takes too long. Implement getBlockHeaders in dapi-client
    const fetchedHistoricalBlocks = []

    for (let i = bestBlockHeight - historicalBlocksToGet + 1;
         i <= bestBlockHeight; i++) {
      const rawBlock = await dapiClient.core.getBlockByHeight(i)
      const block = new Block(rawBlock);

      fetchedHistoricalBlocks.push(block)
    }

    for (let i = 0; i < historicalBlocksToGet; i++) {
      expect(fetchedHistoricalBlocks[i].header.hash).to.equal(blockHeadersHashesFromStream[i]);
    }

    expect(obtainedFreshBlock).to.be.true();
    expect(latestChainLock).to.exist();
  });
});
