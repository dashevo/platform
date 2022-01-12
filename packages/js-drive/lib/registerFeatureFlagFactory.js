const { asValue } = require('awilix');

/**
 * @param {DashPlatformProtocol} dpp
 * @param {DocumentIndexedStoreRepository} documentRepository
 * @param {DocumentIndexedStoreRepository} previousDocumentRepository
 * @param {RootTree} rootTree
 * @param {RootTree} previousRootTree
 * @param {BlockExecutionStoreTransactions} blockExecutionStoreTransactions
 * @param {cloneToPreviousStoreTransactions} cloneToPreviousStoreTransactions
 * @param {AwilixContainer} container
 *
 * @return {registerFeatureFlag}
 */
function registerFeatureFlagFactory(
  dpp,
  documentRepository,
  previousDocumentRepository,
  rootTree,
  previousRootTree,
  blockExecutionStoreTransactions,
  cloneToPreviousStoreTransactions,
  container,
  documentEntropy,
  documentCreatedAt,
  cumulativeFeesFeatureFlagDocumentId,
) {
  /**
   * @typedef registerFeatureFlag
   *
   * @param {string} flagName
   * @param {DataContract} dataContract
   * @param {Identifier} ownerId
   *
   * @return {Promise<void>}
   */
  async function registerFeatureFlag(flagName, dataContract, ownerId) {
    const cumulativeFeesDocument = await dpp.document.create(
      dataContract,
      ownerId,
      flagName,
      {
        enabled: true,
        enableAtHeight: 1,
      },
    );

    cumulativeFeesDocument.id = cumulativeFeesFeatureFlagDocumentId;
    cumulativeFeesDocument.entropy = documentEntropy;
    cumulativeFeesDocument.createdAt = documentCreatedAt;

    await documentRepository.store(cumulativeFeesDocument);
    await documentRepository.store(cumulativeFeesDocument);

    await previousDocumentRepository.store(cumulativeFeesDocument);
    await previousDocumentRepository.store(cumulativeFeesDocument);

    rootTree.rebuild();
    previousRootTree.rebuild();
  }

  return registerFeatureFlag;
}

module.exports = registerFeatureFlagFactory;
