const {
  asValue,
} = require('awilix');

const SimplifiedMNListEntry = require('@dashevo/dashcore-lib/lib/deterministicmnlist/SimplifiedMNListEntry');
const createTestDIContainer = require('../../../../lib/test/createTestDIContainer');

describe('synchronizeMasternodeIdentitiesFactory', () => {
  let container;
  let smlStoreMock;
  let coreHeight;
  let smlFixture;
  let documentsFixture;
  let handleNewMasternodeMock;
  let splitDocumentsIntoChunksMock;
  let newSmlFixture;
  let rawDiff;

  beforeEach(async function beforeEach() {


    // rawDiff = {
    //   baseBlockHash: '644bd9dcbc0537026af6d31181570f934d868f121c55513009bb36f509ec816e',
    //   blockHash: '23beac1b700c4a49855a9653e036219384ac2fab7eeba2ec45b3e2d0063d1285',
    //   cbTxMerkleTree: '03000000032f7f142e19bee0c595dac9f900695d1e428a4db70a805fda6c834cfec0de506a0d39baea39dbbaf9827a1f3b8f381a65ebcf4c2ef415025bc4d20afd372e680d12c226f084a6e28e421fbedff22b13aa1191d6a80744d104fa75ede12332467d0107',
    //   cbTx: '03000500010000000000000000000000000000000000000000000000000000000000000000ffffffff0502e9030101ffffffff01a2567a76070000001976a914f713c2fa5ef0e7c48f0d1b3ad2a79150037c72d788ac00000000460200e90300003fdbe53b9a4cd0b62284195cbd4f4c1655ebdd70e9117ed3c0e49c37bfce46060000000000000000000000000000000000000000000000000000000000000000',
    //   deletedMNs: [],
    //   mnList: [
    //     {
    //       proRegTxHash: 'e57402007ca10454d77437d9c1156b1c4ff8af86d699c08e9a31dbd1dfe3c991',
    //       confirmedHash: '0000000000000000000000000000000000000000000000000000000000000000',
    //       service: '127.0.0.1:20001',
    //       pubKeyOperator: '906d84cb88f532145d8838414f777b971c976ffcf8ccfc57413a13cf2f8a7750a92f9b997a5a741f1afa34d989f4312b',
    //       votingAddress: 'ydC3Qkhq6qc1qgHD8PVSHyAB6t3NYa7aw4',
    //       isValid: true,
    //     },
    //   ],
    //   deletedQuorums: [],
    //   newQuorums: [],
    //   merkleRootMNList: '0646cebf379ce4c0d37e11e970ddeb55164c4fbd5c198422b6d04c9a3be5db3f',
    //   merkleRootQuorums: '0000000000000000000000000000000000000000000000000000000000000000',
    // };

    coreHeight = 3;

    container = await createTestDIContainer();
  });

  it('should create identities for all masternodes on the first sync', async () => {
    const smlFixture = [
      new SimplifiedMNListEntry({
        proRegTxHash: '954112bb018895896cfa3c3d00761a045fc16b22f2170c1fbb029a2936c68f16',
        confirmedHash: '1de71625dbc973e2377ebd7da4fe6f8a8eb8af8c5a99373e36151a4fbe9947cc',
        service: '192.168.65.2:20101',
        pubKeyOperator: '8e4c8c144bd6c62640fe3ae295973d512f83f7f541525a5da3c91e77ec02ff4dcd214e7431b7d2cc28e420ebfeb612ee',
        votingAddress: 'yfLLjdEynGQBdoPcCDUNAxu6pksYGzXKA4',
        isValid: true,
      }),
      new SimplifiedMNListEntry({
        proRegTxHash: '9673b21f45b216dce2b4ffb4a85e1471d57aed6bf8e34d961a48296fe9b7f51a',
        confirmedHash: '25e1884e4251cbf42a0f9f42666443c62d89b3bc1aae73fb1e9d753e0b2732f4',
        service: '192.168.65.2:20201',
        pubKeyOperator: '06a9789fab00deae1464ed80bda281fc833f85959b04201645e5fc25635e3e7ecda30d13d328b721af0809fca3bf3b63',
        votingAddress: 'yVRXh9Tgf9qt9tCbXmeX9FQsEYa526FMxR',
        isValid: true,
      }),
    ];

    const smlStoreMock = {
      getSMLbyHeight: this.sinon.stub().returns({ mnList: smlFixture }),
    };

    const simplifiedMasternodeListMock = {
      getStore: this.sinon.stub().returns(smlStoreMock),
    };

    container.register('simplifiedMasternodeList', asValue(simplifiedMasternodeListMock));

    // Mock Core RPC

    const transaction = {

    }

    // const { result: transaction } = await this.coreRpcClient.getRawTransaction(id, 1);
    //
    // return {
    //   data: Buffer.from(transaction.hex, 'hex'),
    //   height: transaction.height,
    // };

    const rawTransaction = await transactionalStateRepository
      .fetchTransaction(masternodeEntry.proRegTxHash);

    const { extraPayload: proRegTxPayload } = new Transaction(rawTransaction.data);

    coreRpcClientMock = {
      getRawTransaction: this.sinon.stub().resolves({
        result: rawDiff,
      }),
    };



    const synchronizeMasternodeIdentities = container.resolve('synchronizeMasternodeIdentities');

    await synchronizeMasternodeIdentities(coreHeight);

    //simplifiedMasternodeList
  });

  it('should do nothing if nothing changed', async () => {
    const smlFixture = [
      new SimplifiedMNListEntry({
        proRegTxHash: '954112bb018895896cfa3c3d00761a045fc16b22f2170c1fbb029a2936c68f16',
        confirmedHash: '1de71625dbc973e2377ebd7da4fe6f8a8eb8af8c5a99373e36151a4fbe9947cc',
        service: '192.168.65.2:20101',
        pubKeyOperator: '8e4c8c144bd6c62640fe3ae295973d512f83f7f541525a5da3c91e77ec02ff4dcd214e7431b7d2cc28e420ebfeb612ee',
        votingAddress: 'yfLLjdEynGQBdoPcCDUNAxu6pksYGzXKA4',
        isValid: true,
      }),
      new SimplifiedMNListEntry({
        proRegTxHash: '9673b21f45b216dce2b4ffb4a85e1471d57aed6bf8e34d961a48296fe9b7f51a',
        confirmedHash: '25e1884e4251cbf42a0f9f42666443c62d89b3bc1aae73fb1e9d753e0b2732f4',
        service: '192.168.65.2:20201',
        pubKeyOperator: '06a9789fab00deae1464ed80bda281fc833f85959b04201645e5fc25635e3e7ecda30d13d328b721af0809fca3bf3b63',
        votingAddress: 'yVRXh9Tgf9qt9tCbXmeX9FQsEYa526FMxR',
        isValid: true,
      }),
    ];

    const smlStoreMock = {
      getSMLbyHeight: this.sinon.stub().returns({ mnList: smlFixture }),
    };

    const simplifiedMasternodeListMock = {
      getStore: this.sinon.stub().returns(smlStoreMock),
    };

    await synchronizeMasternodeIdentities(coreHeight);

    await synchronizeMasternodeIdentities(coreHeight + 1);


  });

  it('should sync identities if the gap between coreHeight and lastSyncedCoreHeight > smlMaxListsLimit', async () => {
    //coreRpcClient

    coreRpcClientMock = {
      protx: this.sinon.stub().resolves({
        result: rawDiff,
      }),
    };

    await synchronizeMasternodeIdentities(coreHeight);

    await synchronizeMasternodeIdentities(coreHeight + smlMaxListsLimit + 1);

  });

  it('should create masternode identities if new masternode appeared', async () => {
    const smlFixture = [
      new SimplifiedMNListEntry({
        proRegTxHash: '954112bb018895896cfa3c3d00761a045fc16b22f2170c1fbb029a2936c68f16',
        confirmedHash: '1de71625dbc973e2377ebd7da4fe6f8a8eb8af8c5a99373e36151a4fbe9947cc',
        service: '192.168.65.2:20101',
        pubKeyOperator: '8e4c8c144bd6c62640fe3ae295973d512f83f7f541525a5da3c91e77ec02ff4dcd214e7431b7d2cc28e420ebfeb612ee',
        votingAddress: 'yfLLjdEynGQBdoPcCDUNAxu6pksYGzXKA4',
        isValid: true,
      }),
      new SimplifiedMNListEntry({
        proRegTxHash: '9673b21f45b216dce2b4ffb4a85e1471d57aed6bf8e34d961a48296fe9b7f51a',
        confirmedHash: '25e1884e4251cbf42a0f9f42666443c62d89b3bc1aae73fb1e9d753e0b2732f4',
        service: '192.168.65.2:20201',
        pubKeyOperator: '06a9789fab00deae1464ed80bda281fc833f85959b04201645e5fc25635e3e7ecda30d13d328b721af0809fca3bf3b63',
        votingAddress: 'yVRXh9Tgf9qt9tCbXmeX9FQsEYa526FMxR',
        isValid: true,
      }),
    ];

    const smlStoreMock = {
      getSMLbyHeight: this.sinon.stub().returns({ mnList: smlFixture }),
    };

    const simplifiedMasternodeListMock = {
      getStore: this.sinon.stub().returns(smlStoreMock),
    };

    await synchronizeMasternodeIdentities(coreHeight);

    smlStoreMock.getSMLbyHeight.withArgs(coreHeight + 1).returns(
      { mnList: smlFixture.concat(newSmlFixture) },
    );

    const newIdentities = { create: [documentsFixture[0]] };

    handleNewMasternodeMock.returns(newIdentities);
    splitDocumentsIntoChunksMock.returns([newIdentities]);

    smlFixture.push(
      new SimplifiedMNListEntry({
        proRegTxHash: '3b73b21f45b216dce2b4ffb4a85e1471d57aed6bf8e34d961a48296fe9b7f53b',
        confirmedHash: '3be1884e4251cbf42a0f9f42666443c62d89b3bc1aae73fb1e9d753e0b27323b',
        service: '192.168.65.3:20201',
        pubKeyOperator: '3ba9789fab00deae1464ed80bda281fc833f85959b04201645e5fc25635e3e7ecda30d13d328b721af0809fca3bf3b3b',
        votingAddress: 'yVRXh9Tgf9qt9tCbXmeX9FQsEYa526FM3b',
        isValid: true,
      }),
    );

    await synchronizeMasternodeIdentities(coreHeight + 1);
  });

  it('should remove reward shares if masternode disappeared', async () => {
    const smlFixture = [
      new SimplifiedMNListEntry({
        proRegTxHash: '954112bb018895896cfa3c3d00761a045fc16b22f2170c1fbb029a2936c68f16',
        confirmedHash: '1de71625dbc973e2377ebd7da4fe6f8a8eb8af8c5a99373e36151a4fbe9947cc',
        service: '192.168.65.2:20101',
        pubKeyOperator: '8e4c8c144bd6c62640fe3ae295973d512f83f7f541525a5da3c91e77ec02ff4dcd214e7431b7d2cc28e420ebfeb612ee',
        votingAddress: 'yfLLjdEynGQBdoPcCDUNAxu6pksYGzXKA4',
        isValid: true,
      }),
      new SimplifiedMNListEntry({
        proRegTxHash: '9673b21f45b216dce2b4ffb4a85e1471d57aed6bf8e34d961a48296fe9b7f51a',
        confirmedHash: '25e1884e4251cbf42a0f9f42666443c62d89b3bc1aae73fb1e9d753e0b2732f4',
        service: '192.168.65.2:20201',
        pubKeyOperator: '06a9789fab00deae1464ed80bda281fc833f85959b04201645e5fc25635e3e7ecda30d13d328b721af0809fca3bf3b63',
        votingAddress: 'yVRXh9Tgf9qt9tCbXmeX9FQsEYa526FMxR',
        isValid: true,
      }),
    ];

    const smlStoreMock = {
      getSMLbyHeight: this.sinon.stub().returns({ mnList: smlFixture }),
    };

    const simplifiedMasternodeListMock = {
      getStore: this.sinon.stub().returns(smlStoreMock),
    };

    await synchronizeMasternodeIdentities(coreHeight, true);

    smlStoreMock.getSMLbyHeight.withArgs(coreHeight + 1).returns(
      { mnList: [smlFixture[0]] },
    );

    delete smlFixture[1];

    await synchronizeMasternodeIdentities(coreHeight + 1, true);


  });

  it('should remove reward shares if masternode is not valid', async () => {
    const smlFixture = [
      new SimplifiedMNListEntry({
        proRegTxHash: '954112bb018895896cfa3c3d00761a045fc16b22f2170c1fbb029a2936c68f16',
        confirmedHash: '1de71625dbc973e2377ebd7da4fe6f8a8eb8af8c5a99373e36151a4fbe9947cc',
        service: '192.168.65.2:20101',
        pubKeyOperator: '8e4c8c144bd6c62640fe3ae295973d512f83f7f541525a5da3c91e77ec02ff4dcd214e7431b7d2cc28e420ebfeb612ee',
        votingAddress: 'yfLLjdEynGQBdoPcCDUNAxu6pksYGzXKA4',
        isValid: true,
      }),
      new SimplifiedMNListEntry({
        proRegTxHash: '9673b21f45b216dce2b4ffb4a85e1471d57aed6bf8e34d961a48296fe9b7f51a',
        confirmedHash: '25e1884e4251cbf42a0f9f42666443c62d89b3bc1aae73fb1e9d753e0b2732f4',
        service: '192.168.65.2:20201',
        pubKeyOperator: '06a9789fab00deae1464ed80bda281fc833f85959b04201645e5fc25635e3e7ecda30d13d328b721af0809fca3bf3b63',
        votingAddress: 'yVRXh9Tgf9qt9tCbXmeX9FQsEYa526FMxR',
        isValid: true,
      }),
    ];

    const smlStoreMock = {
      getSMLbyHeight: this.sinon.stub().returns({ mnList: smlFixture }),
    };

    const simplifiedMasternodeListMock = {
      getStore: this.sinon.stub().returns(smlStoreMock),
    };

    await synchronizeMasternodeIdentities(coreHeight, true);

    const invalidSmlEntry = smlFixture[1];
    invalidSmlEntry.isValid = false;

    smlStoreMock.getSMLbyHeight.withArgs(coreHeight + 1, false).returns(
      { mnList: [smlFixture[0], invalidSmlEntry] },
    );

    smlFixture[1].isValid = false;

    await synchronizeMasternodeIdentities(coreHeight + 1);


  });

  it('should update create operator identity and reward shares if PubKeyOperator was changed', async () => {
    const smlFixture = [
      new SimplifiedMNListEntry({
        proRegTxHash: '954112bb018895896cfa3c3d00761a045fc16b22f2170c1fbb029a2936c68f16',
        confirmedHash: '1de71625dbc973e2377ebd7da4fe6f8a8eb8af8c5a99373e36151a4fbe9947cc',
        service: '192.168.65.2:20101',
        pubKeyOperator: '8e4c8c144bd6c62640fe3ae295973d512f83f7f541525a5da3c91e77ec02ff4dcd214e7431b7d2cc28e420ebfeb612ee',
        votingAddress: 'yfLLjdEynGQBdoPcCDUNAxu6pksYGzXKA4',
        isValid: true,
      }),
      new SimplifiedMNListEntry({
        proRegTxHash: '9673b21f45b216dce2b4ffb4a85e1471d57aed6bf8e34d961a48296fe9b7f51a',
        confirmedHash: '25e1884e4251cbf42a0f9f42666443c62d89b3bc1aae73fb1e9d753e0b2732f4',
        service: '192.168.65.2:20201',
        pubKeyOperator: '06a9789fab00deae1464ed80bda281fc833f85959b04201645e5fc25635e3e7ecda30d13d328b721af0809fca3bf3b63',
        votingAddress: 'yVRXh9Tgf9qt9tCbXmeX9FQsEYa526FMxR',
        isValid: true,
      }),
    ];

    const smlStoreMock = {
      getSMLbyHeight: this.sinon.stub().returns({ mnList: smlFixture }),
    };

    const simplifiedMasternodeListMock = {
      getStore: this.sinon.stub().returns(smlStoreMock),
    };

    await synchronizeMasternodeIdentities(coreHeight, true);

    const changedSmlEntry = new SimplifiedMNListEntry(smlFixture[1]);
    changedSmlEntry.pubKeyOperator = newSmlFixture.pubKeyOperator;

    smlStoreMock.getSMLbyHeight.withArgs(coreHeight + 1).returns(
      { mnList: [smlFixture[0], changedSmlEntry] },
    );

    smlFixture[1].pubKeyOperator = 'cca9789fab00deae1464ed80bda281fc833f85959b04201645e5fc25635e3e7ecda30d13d328b721af0809fca3bf3bcc'

    await synchronizeMasternodeIdentities(coreHeight + 1, false);


  });
});
