const { hash } = require('@dashevo/dpp/lib/util/hash');
const Identifier = require('@dashevo/dpp/lib/identifier/Identifier');
const IdentityPublicKey = require('@dashevo/dpp/lib/identity/IdentityPublicKey');

/**
 *
 * @param {DashPlatformProtocol} transactionalDpp
 * @param {DriveStateRepository|CachedStateRepositoryDecorator} transactionalStateRepository
 * @param {createMasternodeIdentity} createMasternodeIdentity
 * @param {Identifier} masternodeRewardSharesContractId
 * @param {createRewardShareDocument} createRewardShareDocument
 * @param {DocumentRepository} documentRepository
 * @param {fetchTransaction} fetchTransaction
 * @return {handleUpdatedPubKeyOperator}
 */
function handleUpdatedPubKeyOperatorFactory(
  transactionalDpp,
  transactionalStateRepository,
  createMasternodeIdentity,
  masternodeRewardSharesContractId,
  createRewardShareDocument,
  documentRepository,
  fetchTransaction,
) {
  /**
   * @typedef handleUpdatedPubKeyOperator
   * @param {SimplifiedMNListEntry} masternodeEntry
   * @param {SimplifiedMNListEntry} previousMasternodeEntry
   * @param {DataContract} dataContract
   */
  async function handleUpdatedPubKeyOperator(
    masternodeEntry,
    previousMasternodeEntry,
    dataContract,
  ) {
    const { extraPayload: proRegTxPayload } = await fetchTransaction(masternodeEntry.proRegTxHash);

    // we need to crate reward shares only if it's enabled in proRegTx
    if (proRegTxPayload.operatorReward === 0) {
      return;
    }

    const proRegTxHash = Buffer.from(masternodeEntry.proRegTxHash, 'hex');
    const operatorPublicKey = Buffer.from(masternodeEntry.pubKeyOperator, 'hex');

    const operatorIdentityHash = hash(
      Buffer.concat([
        proRegTxHash,
        operatorPublicKey,
      ]),
    );

    const operatorIdentityId = Identifier.from(operatorIdentityHash);

    const operatorIdentity = await transactionalStateRepository.fetchIdentity(operatorIdentityId);

    //  Create an identity for operator if there is no identity exist with the same ID
    if (operatorIdentity === null) {
      await createMasternodeIdentity(
        operatorIdentityId,
        operatorPublicKey,
        IdentityPublicKey.TYPES.BLS12_381,
      );
    }

    // Create a document in rewards data contract with percentage defined
    // in corresponding ProRegTx

    const masternodeIdentityId = Identifier.from(
      hash(proRegTxHash),
    );

    await createRewardShareDocument(
      dataContract,
      masternodeIdentityId,
      operatorIdentityId,
      proRegTxPayload.operatorReward,
    );

    // Delete document from reward shares data contract with ID corresponding to the
    // masternode identity (ownerId) and previous operator identity (payToId)

    const previousOperatorIdentityHash = hash(
      Buffer.concat([
        proRegTxHash,
        Buffer.from(previousMasternodeEntry.pubKeyOperator, 'hex'),
      ]),
    );

    const previousOperatorIdentityId = Identifier.from(previousOperatorIdentityHash);

    const previousDocuments = await documentRepository.find(
      dataContract,
      'rewardShare',
      {
        where: [
          ['$ownerId', '==', masternodeIdentityId],
          ['payToId', '==', previousOperatorIdentityId],
        ],
      },
      true,
    );

    if (previousDocuments.length > 0) {
      const [previousDocument] = previousDocuments;

      await documentRepository.delete(
        dataContract,
        'rewardShare',
        previousDocument.getId(),
        true,
      );
    }
  }

  return handleUpdatedPubKeyOperator;
}

module.exports = handleUpdatedPubKeyOperatorFactory;
