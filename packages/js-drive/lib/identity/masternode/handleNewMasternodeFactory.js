const Identifier = require('@dashevo/dpp/lib/identifier/Identifier');
const { hash } = require('@dashevo/dpp/lib/util/hash');
const IdentityPublicKey = require('@dashevo/dpp/lib/identity/IdentityPublicKey');
const Transaction = require('@dashevo/dashcore-lib/lib/transaction');

/**
 *
 * @param {DashPlatformProtocol} transactionalDpp
 * @param {DriveStateRepository|CachedStateRepositoryDecorator} stateRepository
 * @param {createMasternodeIdentity} createMasternodeIdentity
 * @param {DataContractStoreRepository} dataContractRepository
 * @param {Identifier} masternodeRewardSharesContractId
 * @return {handleNewMasternode}
 */
function handleNewMasternodeFactory(
  transactionalDpp,
  stateRepository,
  createMasternodeIdentity,
  dataContractRepository,
  masternodeRewardSharesContractId,
) {
  /**
   * @typedef handleNewMasternode
   * @param {SimplifiedMNListEntry} masternodeEntry
   * @return {Promise<{
   *            create: Document[],
   *            delete: Document[],
   * }>}
   */
  async function handleNewMasternode(masternodeEntry) {
    const rawTransaction = await stateRepository
      .fetchTransaction(masternodeEntry.proRegTxHash);

    const { extraPayload: proRegTxPayload } = new Transaction(rawTransaction.data);

    // Create a masternode identity
    const masternodeIdentityId = Identifier.from(
      hash(
        Buffer.from(masternodeEntry.proRegTxHash, 'hex'),
      ),
    );

    await createMasternodeIdentity(
      masternodeIdentityId,
      Buffer.from(proRegTxPayload.keyIDOwner, 'hex'),
      IdentityPublicKey.TYPES.ECDSA_HASH160,
    );

    const documentsToCreate = [];
    const documentsToDelete = [];

    if (proRegTxPayload.operatorReward > 0) {
      const operatorPubKey = Buffer.from(proRegTxPayload.pubKeyOperator, 'hex');

      // Create an identity for operator
      const operatorIdentityHash = hash(
        Buffer.concat([
          masternodeIdentityId.toBuffer(),
          operatorPubKey,
        ]),
      );

      const operatorIdentityId = Identifier.from(operatorIdentityHash);

      await createMasternodeIdentity(
        operatorIdentityId,
        Buffer.from(proRegTxPayload.pubKeyOperator, 'hex'),
        IdentityPublicKey.TYPES.BLS12_381,
      );

      const contract = await dataContractRepository.fetch(masternodeRewardSharesContractId);

      // Create a document in rewards data contract with percentage
      documentsToCreate.push(transactionalDpp.document.create(
        contract,
        Identifier.from(masternodeIdentityId),
        'masternodeRewardShares',
        {
          payToId: operatorIdentityId,
          percentage: proRegTxPayload.operatorReward,
        },
      ));
    }

    return {
      create: documentsToCreate,
      delete: documentsToDelete,
    };
  }

  return handleNewMasternode;
}

module.exports = handleNewMasternodeFactory;
