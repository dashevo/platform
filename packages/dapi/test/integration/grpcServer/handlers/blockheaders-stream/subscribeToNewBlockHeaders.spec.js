const { BlockHeader, Block, ChainLock } = require('@dashevo/dashcore-lib');
const ZmqClient = require('../../../../../lib/externalApis/dashcore/ZmqClient');
const dashCoreRpcClient = require('../../../../../lib/externalApis/dashcore/rpc');

const subscribeToNewBlockHeaders = require('../../../../../lib/grpcServer/handlers/blockheaders-stream/subscribeToNewBlockHeaders');
const ChainDataProvider = require('../../../../../lib/chainDataProvider/ChainDataProvider');
const blockHeadersCache = require('../../../../../lib/chainDataProvider/BlockHeadersCache');
const { NEW_BLOCK_HEADERS_PROPAGATE_INTERVAL } = require('../../../../../lib/grpcServer/handlers/blockheaders-stream/constants');
const ProcessMediator = require('../../../../../lib/grpcServer/handlers/blockheaders-stream/ProcessMediator');
const wait = require('../../../../../lib/utils/wait');

describe('subscribeToNewBlockHeaders', async () => {
  let mediator;
  let zmqClient;

  const blockHeaders = {};
  const chainLocks = {};

  this.sinon.stub(dashCoreRpcClient, 'getBlockHeader')
    .callsFake(async (hash) => blockHeaders[hash].toBuffer().toString('hex'));

  const mockCoreAPI = this.sinon.stub();
  const mockZmqClient = this.sinon.stub();

  const chainDataProvider = new ChainDataProvider(mockCoreAPI, mockZmqClient);
  await chainDataProvider.init();

  beforeEach(async () => {
    mediator = new ProcessMediator();

    dashCoreRpcClient.getBlockHeader.resetHistory();
    blockHeadersCache.purge();

    zmqClient = new ZmqClient();
    this.sinon.stub(zmqClient.subscriberSocket, 'connect')
      .callsFake(() => {
        zmqClient.subscriberSocket.emit('connect');
      });

    await zmqClient.start();

    const blockHeaderOne = new BlockHeader({
      version: 536870913,
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
      merkleRoot: 'c4970326400177ce67ec582425a698b85ae03cae2b0d168e87eed697f1388e4b',
      time: 1507208925,
      timestamp: 1507208645,
      bits: 0,
      nonce: 1449878271,
    });

    const blockOne = new Block({
      header: blockHeaderOne.toObject(),
      transactions: [],
    });

    const blockHeaderTwo = new BlockHeader({
      version: 536870913,
      prevHash: blockOne.hash,
      merkleRoot: 'c4970326400177ce67ec582425a698b85ae03cae2b0d168e87eed697f1388e4c',
      time: 1507208926,
      timestamp: 1507208646,
      bits: 0,
      nonce: 1449878272,
    });

    const blockTwo = new Block({
      header: blockHeaderTwo.toObject(),
      transactions: [],
    });

    const blockHeaderThree = new BlockHeader({
      version: 536870913,
      prevHash: blockTwo.hash,
      merkleRoot: 'c4970326400177ce67ec582425a698b85ae03cae2b0d168e87eed697f1388e4d',
      time: 1507208927,
      timestamp: 1507208647,
      bits: 0,
      nonce: 1449878273,
    });

    blockHeaders[blockHeaderOne.hash] = blockHeaderOne;
    blockHeaders[blockHeaderTwo.hash] = blockHeaderTwo;
    blockHeaders[blockHeaderThree.hash] = blockHeaderThree;

    const chainLockOne = new ChainLock({
      height: 2,
      signature: Buffer.alloc(32).fill(1),
      blockHash: Buffer.alloc(32).fill(2),
    });

    const chainLockTwo = new ChainLock({
      height: 3,
      signature: Buffer.alloc(32).fill(3),
      blockHash: Buffer.alloc(32).fill(4),
    });

    const chainLockThree = new ChainLock({
      height: 4,
      signature: Buffer.alloc(32).fill(5),
      blockHash: Buffer.alloc(32).fill(6),
    });

    chainLocks[chainLockOne.height] = chainLockOne;
    chainLocks[chainLockTwo.height] = chainLockTwo;
    chainLocks[chainLockThree.height] = chainLockThree;
  });

  it('should add blocks and latest chain lock in cache and send them back when historical data is sent', async () => {
    const receivedHeaders = {};
    let latestChainLock = null;

    mediator.on(ProcessMediator.EVENTS.BLOCK_HEADERS, (headers) => {
      headers.forEach((header) => {
        receivedHeaders[header.hash] = header;
      });
    });

    mediator.on(ProcessMediator.EVENTS.CHAIN_LOCK, (chainLock) => {
      latestChainLock = chainLock;
    });

    subscribeToNewBlockHeaders(
      mediator,
      chainDataProvider,
    );

    const hashes = Object.keys(blockHeaders);
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.hashblock, Buffer.from(hashes[0], 'hex'));
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.hashblock, Buffer.from(hashes[1], 'hex'));
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.hashblock, Buffer.from(hashes[2], 'hex'));

    const locksHeights = Object.keys(chainLocks);
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.rawchainlock, chainLocks[locksHeights[0]].toBuffer());
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.rawchainlock, chainLocks[locksHeights[1]].toBuffer());

    mediator.emit(ProcessMediator.EVENTS.HISTORICAL_DATA_SENT);

    await new Promise((resolve) => setImmediate(resolve));
    mediator.emit(ProcessMediator.EVENTS.CLIENT_DISCONNECTED);

    expect(receivedHeaders).to.deep.equal(blockHeaders);
    expect(latestChainLock).to.deep.equal(chainLocks[locksHeights[1]]);
  });

  it('should remove historical data from cache and send only data that is left', async () => {
    const receivedHeaders = {};

    mediator.on(ProcessMediator.EVENTS.BLOCK_HEADERS, (headers) => {
      headers.forEach((header) => {
        receivedHeaders[header.hash] = header;
      });
    });

    subscribeToNewBlockHeaders(
      mediator,
      chainDataProvider,
    );

    const hashes = Object.keys(blockHeaders);
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.hashblock, Buffer.from(hashes[0], 'hex'));
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.hashblock, Buffer.from(hashes[1], 'hex'));
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.hashblock, Buffer.from(hashes[2], 'hex'));

    mediator.emit(ProcessMediator.EVENTS.HISTORICAL_BLOCK_HEADERS_SENT, [hashes[0]]);

    mediator.emit(ProcessMediator.EVENTS.HISTORICAL_DATA_SENT);

    await new Promise((resolve) => setImmediate(resolve));
    mediator.emit(ProcessMediator.EVENTS.CLIENT_DISCONNECTED);

    const expectedHeaders = { ...blockHeaders };
    delete expectedHeaders[hashes[0]];
    expect(receivedHeaders).to.deep.equal(expectedHeaders);
  });

  it('should send fresh chain locks', async () => {
    const receivedChainLocks = {};

    mediator.on(ProcessMediator.EVENTS.CHAIN_LOCK, (chainLock) => {
      receivedChainLocks[chainLock.height] = chainLock;
    });

    subscribeToNewBlockHeaders(
      mediator,
      chainDataProvider,
    );

    const locksHeights = Object.keys(chainLocks);
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.rawchainlock, chainLocks[locksHeights[0]].toBuffer());
    mediator.emit(ProcessMediator.EVENTS.HISTORICAL_DATA_SENT);
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.rawchainlock, chainLocks[locksHeights[1]].toBuffer());
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.rawchainlock, chainLocks[locksHeights[2]].toBuffer());
    await wait(NEW_BLOCK_HEADERS_PROPAGATE_INTERVAL + 100);
    mediator.emit(ProcessMediator.EVENTS.CLIENT_DISCONNECTED);
    const expectedChainLocks = { ...chainLocks };
    delete expectedChainLocks[locksHeights[1]];
    expect(receivedChainLocks).to.deep.equal(expectedChainLocks);
  });

  it('should use cache when historical data is sent', async () => {
    const spyCache = this.sinon.spy(blockHeadersCache);
    const receivedHeaders = {};

    mediator.on(ProcessMediator.EVENTS.BLOCK_HEADERS, (headers) => {
      headers.forEach((header) => {
        receivedHeaders[header.hash] = header;
      });
    });

    subscribeToNewBlockHeaders(
      mediator,
      chainDataProvider,
    );

    const hashes = Object.keys(blockHeaders);
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.hashblock, Buffer.from(hashes[0], 'hex'));
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.hashblock, Buffer.from(hashes[1], 'hex'));
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.hashblock, Buffer.from(hashes[2], 'hex'));

    const locksHeights = Object.keys(chainLocks);
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.rawchainlock, chainLocks[locksHeights[0]].toBuffer());
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.rawchainlock, chainLocks[locksHeights[1]].toBuffer());

    mediator.emit(ProcessMediator.EVENTS.HISTORICAL_DATA_SENT);

    await new Promise((resolve) => setImmediate(resolve));
    mediator.emit(ProcessMediator.EVENTS.CLIENT_DISCONNECTED);

    expect(dashCoreRpcClient.getBlockHeader.callCount).to.be.equal(3);
    dashCoreRpcClient.getBlockHeader.resetHistory();

    subscribeToNewBlockHeaders(
      mediator,
      chainDataProvider,
    );

    zmqClient.subscriberSocket.emit('message', zmqClient.topics.hashblock, Buffer.from(hashes[0], 'hex'));
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.hashblock, Buffer.from(hashes[1], 'hex'));
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.hashblock, Buffer.from(hashes[2], 'hex'));

    zmqClient.subscriberSocket.emit('message', zmqClient.topics.rawchainlock, chainLocks[locksHeights[0]].toBuffer());
    zmqClient.subscriberSocket.emit('message', zmqClient.topics.rawchainlock, chainLocks[locksHeights[1]].toBuffer());

    mediator.emit(ProcessMediator.EVENTS.HISTORICAL_DATA_SENT);

    expect(dashCoreRpcClient.getBlockHeader.callCount).to.be.equal(0);
    expect(spyCache.set.callCount).to.be.equal(3);
    expect(spyCache.get.callCount).to.be.equal(6);
  });
});
