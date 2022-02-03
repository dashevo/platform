const {
  createContainer: createAwilixContainer,
  InjectionMode,
  asClass,
  asFunction,
  asValue,
} = require('awilix');

const fs = require('fs');

const Long = require('long');

const GroveDB = require('@dashevo/node-grove');

const LRUCache = require('lru-cache');
const RpcClient = require('@dashevo/dashd-rpc/promise');

const { PublicKey } = require('@dashevo/dashcore-lib');

const DashPlatformProtocol = require('@dashevo/dpp');

const Identifier = require('@dashevo/dpp/lib/identifier/Identifier');

const findMyWay = require('find-my-way');

const pino = require('pino');
const pinoMultistream = require('pino-multi-stream');

const createABCIServer = require('@dashevo/abci');

const protocolVersion = require('@dashevo/dpp/lib/version/protocolVersion');

const decodeProtocolEntityFactory = require('@dashevo/dpp/lib/decodeProtocolEntityFactory');

const featureFlagsSystemIds = require('@dashevo/feature-flags-contract/lib/systemIds');
const featureFlagsDocuments = require('@dashevo/feature-flags-contract/schema/feature-flags-documents.json');

const dpnsSystemIds = require('@dashevo/dpns-contract/lib/systemIds');
const dpnsDocuments = require('@dashevo/dpns-contract/schema/dpns-contract-documents.json');

const masternodeRewardsSystemIds = require('@dashevo/masternode-reward-shares-contract/lib/systemIds');
const masternodeRewardsDocuments = require('@dashevo/masternode-reward-shares-contract/schema/masternode-reward-shares-documents.json');

const dashpaySystemIds = require('@dashevo/dashpay-contract/lib/systemIds');
const dashpayDocuments = require('@dashevo/dashpay-contract/schema/dashpay.schema.json');

const packageJSON = require('../package.json');

const ZMQClient = require('./core/ZmqClient');

const sanitizeUrl = require('./util/sanitizeUrl');

const LatestCoreChainLock = require('./core/LatestCoreChainLock');

const GroveDBStore = require('./groveDB/GroveDBStore');
const IdentityStoreRepository = require('./identity/IdentityStoreRepository');

const PublicKeyToIdentityIdStoreRepository = require(
  './identity/PublicKeyToIdentityIdStoreRepository',
);

const DataContractStoreRepository = require('./dataContract/DataContractStoreRepository');
const DocumentStoreRepository = require('./document/DocumentRepository');
const findConflictingConditions = require('./document/query/findConflictingConditions');
const validateQueryFactory = require('./document/query/validateQueryFactory');

const fetchDocumentsFactory = require('./document/fetchDocumentsFactory');
const BlockExecutionContext = require('./blockExecution/BlockExecutionContext');

const CreditsDistributionPoolRepository = require('./creditsDistributionPool/CreditsDistributionPoolRepository');
const unserializeStateTransitionFactory = require(
  './abci/handlers/stateTransition/unserializeStateTransitionFactory',
);
const DriveStateRepository = require('./dpp/DriveStateRepository');

const CachedStateRepositoryDecorator = require('./dpp/CachedStateRepositoryDecorator');
const LoggedStateRepositoryDecorator = require('./dpp/LoggedStateRepositoryDecorator');
const dataContractQueryHandlerFactory = require('./abci/handlers/query/dataContractQueryHandlerFactory');
const identityQueryHandlerFactory = require('./abci/handlers/query/identityQueryHandlerFactory');
const documentQueryHandlerFactory = require('./abci/handlers/query/documentQueryHandlerFactory');
const identitiesByPublicKeyHashesQueryHandlerFactory = require('./abci/handlers/query/identitiesByPublicKeyHashesQueryHandlerFactory');

const getProofsQueryHandlerFactory = require('./abci/handlers/query/getProofsQueryHandlerFactory');
const identityIdsByPublicKeyHashesQueryHandlerFactory = require('./abci/handlers/query/identityIdsByPublicKeyHashesQueryHandlerFactory');

const verifyChainLockQueryHandlerFactory = require('./abci/handlers/query/verifyChainLockQueryHandlerFactory');

const wrapInErrorHandlerFactory = require('./abci/errors/wrapInErrorHandlerFactory');
const errorHandlerFactory = require('./errorHandlerFactory');
const checkTxHandlerFactory = require('./abci/handlers/checkTxHandlerFactory');
const commitHandlerFactory = require('./abci/handlers/commitHandlerFactory');
const deliverTxHandlerFactory = require('./abci/handlers/deliverTxHandlerFactory');
const initChainHandlerFactory = require('./abci/handlers/initChainHandlerFactory');
const infoHandlerFactory = require('./abci/handlers/infoHandlerFactory');
const beginBlockHandlerFactory = require('./abci/handlers/beginBlockHandlerFactory');

const endBlockHandlerFactory = require('./abci/handlers/endBlockHandlerFactory');
const queryHandlerFactory = require('./abci/handlers/queryHandlerFactory');
const waitForCoreSyncFactory = require('./core/waitForCoreSyncFactory');
const waitForCoreChainLockSyncFactory = require('./core/waitForCoreChainLockSyncFactory');
const updateSimplifiedMasternodeListFactory = require('./core/updateSimplifiedMasternodeListFactory');
const waitForChainLockedHeightFactory = require('./core/waitForChainLockedHeightFactory');
const SimplifiedMasternodeList = require('./core/SimplifiedMasternodeList');

const decodeChainLock = require('./core/decodeChainLock');
const SpentAssetLockTransactionsRepository = require('./identity/SpentAssetLockTransactionsRepository');
const enrichErrorWithConsensusErrorFactory = require('./abci/errors/enrichErrorWithConsensusLoggerFactory');
const CreditsDistributionPool = require('./creditsDistributionPool/CreditsDistributionPool');
const closeAbciServerFactory = require('./abci/closeAbciServerFactory');
const getLatestFeatureFlagFactory = require('./featureFlag/getLatestFeatureFlagFactory');
const getFeatureFlagForHeightFactory = require('./featureFlag/getFeatureFlagForHeightFactory');
const ValidatorSet = require('./validator/ValidatorSet');
const createValidatorSetUpdate = require('./abci/handlers/validator/createValidatorSetUpdate');
const fetchQuorumMembersFactory = require('./core/fetchQuorumMembersFactory');
const getRandomQuorum = require('./core/getRandomQuorum');
const createQueryResponseFactory = require('./abci/handlers/query/response/createQueryResponseFactory');
const BlockExecutionContextStackRepository = require('./blockExecution/BlockExecutionContextStackRepository');
const rotateSignedStoreFactory = require('./groveDB/rotateSignedStoreFactory');
const BlockExecutionContextStack = require('./blockExecution/BlockExecutionContextStack');
const createInitialStateStructureFactory = require('./state/createInitialStateStructureFactory');
const encodeDocumentPropertyValue = require('./document/groveDB/encodeDocumentPropertyValue');
const createGroveDBPathQueryFactory = require('./document/groveDB/createGroveDBPathQueryFactory');
const findAppropriateIndex = require('./document/query/findAppropriateIndex');

const registerSystemDataContractFactory = require('./state/registerSystemDataContractFactory');
const registerTopLevelDomainFactory = require('./state/registerTopLevelDomainFactory');
const registerFeatureFlagFactory = require('./state/registerFeatureFlagFactory');
const synchronizeMasternodeIdentitiesFactory = require('./identity/masternode/synchronizeMasternodeIdentitiesFactory');
const createMasternodeIdentityFactory = require('./identity/masternode/createMasternodeIdentityFactory');
const handleNewMasternodeFactory = require('./identity/masternode/handleNewMasternodeFactory');
const handleUpdatedPubKeyOperatorFactory = require('./identity/masternode/handleUpdatedPubKeyOperatorFactory');
const splitDocumentsIntoChunks = require('./identity/masternode/splitDocumentsIntoChunks');

/**
 *
 * @param {Object} options
 * @param {string} options.ABCI_HOST
 * @param {string} options.ABCI_PORT
 * @param {string} options.DB_PATH
 * @param {string} options.GROVEDB_LATEST_FILE
 * @param {string} options.DATA_CONTRACT_CACHE_SIZE
 * @param {string} options.CORE_JSON_RPC_HOST
 * @param {string} options.CORE_JSON_RPC_PORT
 * @param {string} options.CORE_JSON_RPC_USERNAME
 * @param {string} options.CORE_JSON_RPC_PASSWORD
 * @param {string} options.CORE_ZMQ_HOST
 * @param {string} options.CORE_ZMQ_PORT
 * @param {string} options.CORE_ZMQ_CONNECTION_RETRIES
 * @param {string} options.NETWORK
 * @param {string} options.DPNS_MASTER_PUBLIC_KEY
 * @param {string} options.DASHPAY_MASTER_PUBLIC_KEY
 * @param {string} options.FEATURE_FLAGS_MASTER_PUBLIC_KEY
 * @param {string} options.MASTERNODE_REWARD_SHARES_MASTER_PUBLIC_KEY
 * @param {string} options.INITIAL_CORE_CHAINLOCKED_HEIGHT
 * @param {string} options.VALIDATOR_SET_LLMQ_TYPE
 * @param {string} options.TENDERDASH_P2P_PORT
 * @param {string} options.LOG_STDOUT_LEVEL
 * @param {string} options.LOG_PRETTY_FILE_LEVEL
 * @param {string} options.LOG_PRETTY_FILE_PATH
 * @param {string} options.LOG_JSON_FILE_LEVEL
 * @param {string} options.LOG_JSON_FILE_PATH
 * @param {string} options.LOG_STATE_REPOSITORY
 * @param {string} options.NODE_ENV
 *
 * @return {AwilixContainer}
 */
function createDIContainer(options) {
  if (!options.DPNS_MASTER_PUBLIC_KEY) {
    throw new Error('DPNS_MASTER_PUBLIC_KEY must be set');
  }

  if (!options.DASHPAY_MASTER_PUBLIC_KEY) {
    throw new Error('DASHPAY_MASTER_PUBLIC_KEY must be set');
  }

  if (!options.FEATURE_FLAGS_MASTER_PUBLIC_KEY) {
    throw new Error('FEATURE_FLAGS_MASTER_PUBLIC_KEY must be set');
  }

  if (!options.MASTERNODE_REWARD_SHARES_MASTER_PUBLIC_KEY) {
    throw new Error('MASTERNODE_REWARD_SHARES_MASTER_PUBLIC_KEY must be set');
  }

  const container = createAwilixContainer({
    injectionMode: InjectionMode.CLASSIC,
  });

  /**
   * Register itself (usually to solve recursive dependencies)
   */
  container.register({
    container: asValue(container),
  });

  /**
   * Register latest protocol version
   * Define highest supported protocol version
   */
  container.register({
    latestProtocolVersion: asValue(Long.fromInt(protocolVersion.latestVersion)),
  });

  /**
   * Register environment variables
   */
  container.register({
    abciHost: asValue(options.ABCI_HOST),
    abciPort: asValue(options.ABCI_PORT),

    dbPath: asValue(options.DB_PATH),

    groveDBLatestFile: asValue(options.GROVEDB_LATEST_FILE),
    dataContractCacheSize: asValue(options.DATA_CONTRACT_CACHE_SIZE),

    coreJsonRpcHost: asValue(options.CORE_JSON_RPC_HOST),
    coreJsonRpcPort: asValue(options.CORE_JSON_RPC_PORT),
    coreJsonRpcUsername: asValue(options.CORE_JSON_RPC_USERNAME),
    coreJsonRpcPassword: asValue(options.CORE_JSON_RPC_PASSWORD),
    coreZMQHost: asValue(options.CORE_ZMQ_HOST),
    coreZMQPort: asValue(options.CORE_ZMQ_PORT),
    coreZMQConnectionRetries: asValue(
      parseInt(options.CORE_ZMQ_CONNECTION_RETRIES, 10),
    ),
    network: asValue(options.NETWORK),
    logStdoutLevel: asValue(options.LOG_STDOUT_LEVEL),
    logPrettyFileLevel: asValue(options.LOG_PRETTY_FILE_LEVEL),
    logPrettyFilePath: asValue(options.LOG_PRETTY_FILE_PATH),
    logJsonFileLevel: asValue(options.LOG_JSON_FILE_LEVEL),
    logJsonFilePath: asValue(options.LOG_JSON_FILE_PATH),
    logStateRepository: asValue(options.LOG_STATE_REPOSITORY === 'true'),
    isProductionEnvironment: asValue(options.NODE_ENV === 'production'),
    maxIdentitiesPerRequest: asValue(25),
    smlMaxListsLimit: asValue(16),
    initialCoreChainLockedHeight: asValue(
      parseInt(options.INITIAL_CORE_CHAINLOCKED_HEIGHT, 10),
    ),
    validatorSetLLMQType: asValue(
      parseInt(options.VALIDATOR_SET_LLMQ_TYPE, 10),
    ),
    masternodeRewardSharesContractId: asValue(
      Identifier.from(masternodeRewardsSystemIds.contractId),
    ),
    masternodeRewardSharesOwnerId: asValue(
      Identifier.from(masternodeRewardsSystemIds.ownerId),
    ),
    masternodeRewardSharesOwnerPublicKey: asValue(
      PublicKey.fromString(
        options.MASTERNODE_REWARD_SHARES_MASTER_PUBLIC_KEY,
      ),
    ),
    masternodeRewardSharesDocuments: asValue(
      masternodeRewardsDocuments,
    ),
    featureFlagsContractId: asValue(
      Identifier.from(featureFlagsSystemIds.contractId),
    ),
    featureFlagsOwnerId: asValue(
      Identifier.from(featureFlagsSystemIds.ownerId),
    ),
    featureFlagsOwnerPublicKey: asValue(
      PublicKey.fromString(
        options.FEATURE_FLAGS_MASTER_PUBLIC_KEY,
      ),
    ),
    featureFlagsDocuments: asValue(featureFlagsDocuments),
    dpnsContractId: asValue(Identifier.from(dpnsSystemIds.contractId)),
    dpnsOwnerId: asValue(Identifier.from(dpnsSystemIds.ownerId)),
    dpnsOwnerPublicKey: asValue(
      PublicKey.fromString(
        options.DPNS_MASTER_PUBLIC_KEY,
      ),
    ),
    dpnsDocuments: asValue(dpnsDocuments),
    dashpayContractId: asValue(Identifier.from(dashpaySystemIds.contractId)),
    dashpayOwnerId: asValue(Identifier.from(dashpaySystemIds.ownerId)),
    dashpayOwnerPublicKey: asValue(
      PublicKey.fromString(
        options.DASHPAY_MASTER_PUBLIC_KEY,
      ),
    ),
    dashpayDocuments: asValue(dashpayDocuments),
    tenderdashP2pPort: asValue(options.TENDERDASH_P2P_PORT),
  });

  /**
   * Register global DPP options
   */
  container.register({
    dppOptions: asValue({}),
  });

  /**
   * Register Core related
   */
  container.register({
    latestCoreChainLock: asValue(new LatestCoreChainLock()),
    simplifiedMasternodeList: asClass(SimplifiedMasternodeList).proxy().singleton(),
    decodeChainLock: asValue(decodeChainLock),
    fetchQuorumMembers: asFunction(fetchQuorumMembersFactory),
    getRandomQuorum: asValue(getRandomQuorum),
    coreZMQClient: asFunction((
      coreZMQHost,
      coreZMQPort,
      coreZMQConnectionRetries,
    ) => (
      new ZMQClient(coreZMQHost, coreZMQPort, {
        maxRetryCount: coreZMQConnectionRetries,
      })
    )).singleton(),

    coreRpcClient: asFunction((
      coreJsonRpcHost,
      coreJsonRpcPort,
      coreJsonRpcUsername,
      coreJsonRpcPassword,
    ) => (
      new RpcClient({
        protocol: 'http',
        host: coreJsonRpcHost,
        port: coreJsonRpcPort,
        user: coreJsonRpcUsername,
        pass: coreJsonRpcPassword,
      })
    )).singleton(),
  });

  /**
   * Register common services
   */
  container.register({
    loggerPrettyfierOptions: asValue({
      translateTime: true,
    }),

    logStdoutStream: asFunction((loggerPrettyfierOptions) => pinoMultistream.prettyStream({
      prettyPrint: loggerPrettyfierOptions,
    })).singleton(),

    logPrettyFileStream: asFunction((
      logPrettyFilePath,
      loggerPrettyfierOptions,
    ) => pinoMultistream.prettyStream({
      prettyPrint: loggerPrettyfierOptions,
      dest: fs.createWriteStream(logPrettyFilePath, { flags: 'a' }),
    })).singleton(),

    logJsonFileStream: asFunction((logJsonFilePath) => fs.createWriteStream(logJsonFilePath, { flags: 'a' }))
      .disposer(async (stream) => new Promise((resolve) => stream.end(resolve))).singleton(),

    loggerStreams: asFunction((
      logStdoutLevel,
      logStdoutStream,
      logPrettyFileLevel,
      logPrettyFileStream,
      logJsonFileLevel,
      logJsonFileStream,
    ) => [
      {
        level: logStdoutLevel,
        stream: logStdoutStream,
      },
      {
        level: logPrettyFileLevel,
        stream: logPrettyFileStream,
      },
      {
        level: logJsonFileLevel,
        stream: logJsonFileStream,
      },
    ]),

    logger: asFunction(
      (loggerStreams) => pino({
        level: 'trace',
      }, pinoMultistream.multistream(loggerStreams))
        .child({ driveVersion: packageJSON.version }),
    ).singleton(),

    noopLogger: asFunction(() => (
      Object.keys(pino.levels.values).reduce((logger, functionName) => ({
        ...logger,
        [functionName]: () => {},
      }), {})
    )).singleton(),

    sanitizeUrl: asValue(sanitizeUrl),
  });

  /**
   * GroveDB store
   */

  container.register({
    groveDB: asFunction((groveDBLatestFile) => GroveDB.open(groveDBLatestFile)).singleton(),

    groveDBStore: asFunction((
      groveDB,
    ) => (
      new GroveDBStore(groveDB, 'latest')
    )).disposer(async (groveDBStore) => {
    // Flush data on disk
    // await groveDBStore.db.flushSync();

      await groveDBStore.db.close();

      if (process.env.NODE_ENV === 'test') {
        fs.rmSync(options.GROVEDB_LATEST_FILE, { recursive: true });
      }

      console.log('closed');
    }).singleton(),

    signedGroveDBStore: asFunction((
      groveDB,
    ) => (
      new GroveDBStore(groveDB, 'signed')
    )).disposer(async (groveDBStore) => {
      // Flush data on disk
      // await groveDBStore.db.flushSync();

      await groveDBStore.db.close();

      console.log('closed');
    }).singleton(),

    rotateSignedStore: asFunction(rotateSignedStoreFactory).singleton(),
    createInitialStateStructure: asFunction(createInitialStateStructureFactory).singleton(),
  });

  /**
   * Register Identity
   */
  container.register({
    identityRepository: asClass(IdentityStoreRepository).singleton(),

    signedIdentityRepository: asFunction((
      signedGroveDBStore,
      dpp,
    ) => (new IdentityStoreRepository(signedGroveDBStore, dpp))).singleton(),

    publicKeyToIdentityIdRepository: asClass(PublicKeyToIdentityIdStoreRepository).singleton(),

    signedPublicKeyToIdentityIdRepository: asFunction((
      signedGroveDBStore,
    ) => (
      new PublicKeyToIdentityIdStoreRepository(signedGroveDBStore)
    )).singleton(),
  });

  /**
   * Register asset lock transactions
   */
  container.register({
    spentAssetLockTransactionsRepository: asClass(SpentAssetLockTransactionsRepository).singleton(),

    signedSpentAssetLockTransactionsRepository: asFunction((
      signedGroveDBStore,
    ) => (
      new SpentAssetLockTransactionsRepository(signedGroveDBStore)
    )).singleton(),
  });

  /**
   * Register Data Contract
   */
  container.register({
    dataContractRepository: asClass(DataContractStoreRepository).singleton(),

    signedDataContractRepository: asFunction((
      signedGroveDBStore,
      dpp,
    ) => (new DataContractStoreRepository(signedGroveDBStore, dpp))).singleton(),

    dataContractCache: asFunction((dataContractCacheSize) => (
      new LRUCache(dataContractCacheSize)
    )).singleton(),

    signedDataContractCache: asFunction((dataContractCacheSize) => (
      new LRUCache(dataContractCacheSize)
    )).singleton(),
  });

  /**
   * Register Document
   */
  container.register({
    encodeDocumentPropertyValue: asValue(encodeDocumentPropertyValue),
    createGroveDBPathQuery: asFunction(createGroveDBPathQueryFactory),
    findAppropriateIndex: asValue(findAppropriateIndex),

    documentRepository: asClass(DocumentStoreRepository).singleton(),
    signedDocumentRepository: asFunction((
      signedGroveDBStore,
      validateQuery,
      decodeProtocolEntity,
      createGroveDBPathQuery,
    ) => (new DocumentStoreRepository(
      signedGroveDBStore,
      encodeDocumentPropertyValue,
      validateQuery,
      decodeProtocolEntity,
      createGroveDBPathQuery,
    ))).singleton(),

    findConflictingConditions: asValue(findConflictingConditions),
    validateQuery: asFunction(validateQueryFactory).singleton(),

    fetchDocuments: asFunction(fetchDocumentsFactory).singleton(),

    fetchSignedDocuments: asFunction((
      signedDocumentRepository,
      signedDataContractRepository,
      signedDataContractCache,
    ) => (
      fetchDocumentsFactory(
        signedDocumentRepository,
        signedDataContractRepository,
        signedDataContractCache,
      )
    )).singleton(),
  });

  /**
   * Register credits distribution pool
   */
  container.register({
    creditsDistributionPoolRepository: asClass(CreditsDistributionPoolRepository)
      .singleton(),

    signedCreditsDistributionPoolRepository: asFunction((
      signedGroveDBStore,
    ) => (new CreditsDistributionPoolRepository(signedGroveDBStore))).singleton(),

    creditsDistributionPool: asValue(new CreditsDistributionPool()),
  });

  /**
   * Register block execution context
   */
  container.register({
    blockExecutionContext: asClass(BlockExecutionContext).singleton(),
    blockExecutionContextStack: asClass(BlockExecutionContextStack).singleton(),
    blockExecutionContextStackRepository: asClass(BlockExecutionContextStackRepository).singleton(),
  });

  /**
   * Register DPP
   */
  container.register({
    decodeProtocolEntity: asFunction(decodeProtocolEntityFactory),

    stateRepository: asFunction((
      identityRepository,
      publicKeyToIdentityIdRepository,
      dataContractRepository,
      fetchDocuments,
      documentRepository,
      spentAssetLockTransactionsRepository,
      coreRpcClient,
      dataContractCache,
      blockExecutionContext,
      simplifiedMasternodeList,
    ) => {
      const stateRepository = new DriveStateRepository(
        identityRepository,
        publicKeyToIdentityIdRepository,
        dataContractRepository,
        fetchDocuments,
        documentRepository,
        spentAssetLockTransactionsRepository,
        coreRpcClient,
        blockExecutionContext,
        simplifiedMasternodeList,
        dataContractCache,
      );

      return new CachedStateRepositoryDecorator(
        stateRepository,
        dataContractCache,
      );
    }).singleton(),

    transactionalStateRepository: asFunction((
      identityRepository,
      publicKeyToIdentityIdRepository,
      dataContractRepository,
      fetchDocuments,
      documentRepository,
      spentAssetLockTransactionsRepository,
      coreRpcClient,
      dataContractCache,
      blockExecutionContext,
      simplifiedMasternodeList,
      logStateRepository,
    ) => {
      const stateRepository = new DriveStateRepository(
        identityRepository,
        publicKeyToIdentityIdRepository,
        dataContractRepository,
        fetchDocuments,
        documentRepository,
        spentAssetLockTransactionsRepository,
        coreRpcClient,
        blockExecutionContext,
        simplifiedMasternodeList,
        dataContractCache,
        {
          useTransaction: true,
        },
      );

      const cachedRepository = new CachedStateRepositoryDecorator(
        stateRepository, dataContractCache,
      );

      if (!logStateRepository) {
        return cachedRepository;
      }

      return new LoggedStateRepositoryDecorator(
        cachedRepository,
        blockExecutionContext,
      );
    }).singleton(),

    unserializeStateTransition: asFunction((
      dpp,
      noopLogger,
    ) => unserializeStateTransitionFactory(dpp, noopLogger)).singleton(),

    transactionalUnserializeStateTransition: asFunction((
      transactionalDpp,
      noopLogger,
    ) => unserializeStateTransitionFactory(transactionalDpp, noopLogger)).singleton(),

    dpp: asFunction((stateRepository, dppOptions) => (
      new DashPlatformProtocol({
        ...dppOptions,
        stateRepository,
      })
    )).singleton(),

    transactionalDpp: asFunction((transactionalStateRepository, dppOptions) => (
      new DashPlatformProtocol({
        ...dppOptions,
        stateRepository: transactionalStateRepository,
      })
    )).singleton(),
  });

  /**
   * Register validator quorums
   */
  container.register({
    validatorSet: asClass(ValidatorSet),
  });

  /**
   * Register feature flags stuff
   */
  container.register({
    getLatestFeatureFlag: asFunction(getLatestFeatureFlagFactory),
    getFeatureFlagForHeight: asFunction(getFeatureFlagForHeightFactory),
  });

  /**
   * Register Core stuff
   */
  container.register({
    waitForCoreSync: asFunction(waitForCoreSyncFactory).singleton(),

    updateSimplifiedMasternodeList: asFunction(updateSimplifiedMasternodeListFactory).singleton(),

    waitForChainLockedHeight: asFunction(waitForChainLockedHeightFactory).singleton(),

    waitForCoreChainLockSync: asFunction(waitForCoreChainLockSyncFactory).singleton(),

    waitReplicaSetInitialize: asFunction(waitReplicaSetInitializeFactory).singleton(),

    synchronizeMasternodeIdentities: asFunction(synchronizeMasternodeIdentitiesFactory).singleton(),

    createMasternodeIdentity: asFunction(createMasternodeIdentityFactory).singleton(),

    handleNewMasternode: asFunction(handleNewMasternodeFactory).singleton(),

    handleUpdatedPubKeyOperator: asFunction(handleUpdatedPubKeyOperatorFactory).singleton(),

    splitDocumentsIntoChunks: asValue(splitDocumentsIntoChunks),
  });

  /**
   * Register system data contract utils
   */
  container.register({
    registerSystemDataContract: asFunction(registerSystemDataContractFactory).singleton(),
    registerTopLevelDomain: asFunction(registerTopLevelDomainFactory).singleton(),
    registerFeatureFlag: asFunction(registerFeatureFlagFactory).singleton(),
    cumulativeFeesFeatureFlagDocumentId: asValue(
      Identifier.from('73qjFBuY4Zb8DqUpj6RYgG9rYDARNPFnEnyt8u4bxPcw'),
    ),
    dashPreorderDocumentId: asValue(
      Identifier.from('i8QZtAJ1WshunyZg64wGYcm3jASrpeSKAbAYVHTxvsL'),
    ),
    dashDomainDocumentId: asValue(
      Identifier.from('FXyN2NZAdRFADgBQfb1XM1Qq7pWoEcgSWj1GaiQJqcrS'),
    ),
    dashPreorderSalt: asValue(
      Buffer.from('e0b508c5a36825a206693a1f414aa13edbecf43c41e3c799ea9e737b4f9aa226', 'hex'),
    ),
  });

  /**
   * Register ABCI handlers
   */
  container.register({
    createQueryResponse: asFunction(createQueryResponseFactory).singleton(),
    createValidatorSetUpdate: asValue(createValidatorSetUpdate),
    identityQueryHandler: asFunction(identityQueryHandlerFactory).singleton(),
    dataContractQueryHandler: asFunction(dataContractQueryHandlerFactory).singleton(),
    documentQueryHandler: asFunction(documentQueryHandlerFactory).singleton(),
    getProofsQueryHandler: asFunction(getProofsQueryHandlerFactory).singleton(),
    identitiesByPublicKeyHashesQueryHandler:
      asFunction(identitiesByPublicKeyHashesQueryHandlerFactory).singleton(),
    identityIdsByPublicKeyHashesQueryHandler:
      asFunction(identityIdsByPublicKeyHashesQueryHandlerFactory).singleton(),
    verifyChainLockQueryHandler: asFunction(verifyChainLockQueryHandlerFactory).singleton(),

    queryHandlerRouter: asFunction((
      identityQueryHandler,
      dataContractQueryHandler,
      documentQueryHandler,
      identitiesByPublicKeyHashesQueryHandler,
      identityIdsByPublicKeyHashesQueryHandler,
      verifyChainLockQueryHandler,
      getProofsQueryHandler,
    ) => {
      const router = findMyWay({
        ignoreTrailingSlash: true,
      });

      router.on('GET', '/identities', identityQueryHandler);
      router.on('GET', '/dataContracts', dataContractQueryHandler);
      router.on('GET', '/dataContracts/documents', documentQueryHandler);
      router.on('GET', '/proofs', getProofsQueryHandler);
      router.on('GET', '/identities/by-public-key-hash', identitiesByPublicKeyHashesQueryHandler);
      router.on('GET', '/identities/by-public-key-hash/id', identityIdsByPublicKeyHashesQueryHandler);
      router.on('GET', '/verify-chainlock', verifyChainLockQueryHandler, { rawData: true });

      return router;
    }).singleton(),

    infoHandler: asFunction(infoHandlerFactory).singleton(),
    checkTxHandler: asFunction(checkTxHandlerFactory).singleton(),
    beginBlockHandler: asFunction(beginBlockHandlerFactory).singleton(),
    deliverTxHandler: asFunction(deliverTxHandlerFactory).singleton(),
    initChainHandler: asFunction(initChainHandlerFactory).singleton(),
    endBlockHandler: asFunction(endBlockHandlerFactory).singleton(),
    commitHandler: asFunction(commitHandlerFactory).singleton(),
    queryHandler: asFunction(queryHandlerFactory).singleton(),

    wrapInErrorHandler: asFunction(wrapInErrorHandlerFactory).singleton(),
    enrichErrorWithConsensusError: asFunction(enrichErrorWithConsensusErrorFactory).singleton(),
    errorHandler: asFunction(errorHandlerFactory).singleton(),

    abciHandlers: asFunction((
      infoHandler,
      checkTxHandler,
      beginBlockHandler,
      deliverTxHandler,
      initChainHandler,
      endBlockHandler,
      commitHandler,
      wrapInErrorHandler,
      enrichErrorWithConsensusError,
      queryHandler,
    ) => ({
      info: infoHandler,
      checkTx: wrapInErrorHandler(checkTxHandler, { respondWithInternalError: true }),
      beginBlock: enrichErrorWithConsensusError(beginBlockHandler),
      deliverTx: wrapInErrorHandler(enrichErrorWithConsensusError(deliverTxHandler)),
      initChain: initChainHandler,
      endBlock: enrichErrorWithConsensusError(endBlockHandler),
      commit: enrichErrorWithConsensusError(commitHandler),
      query: wrapInErrorHandler(queryHandler, { respondWithInternalError: true }),
    })).singleton(),

    closeAbciServer: asFunction(closeAbciServerFactory).singleton(),

    abciServer: asFunction((abciHandlers) => createABCIServer(abciHandlers))
      .singleton(),
  });

  return container;
}

module.exports = createDIContainer;
