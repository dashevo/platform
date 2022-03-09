const Identifier = require('@dashevo/dpp/lib/identifier/Identifier');
const { hash } = require('@dashevo/dpp/lib/util/hash');
const IdentityPublicKey = require('@dashevo/dpp/lib/identity/IdentityPublicKey');

/**
 *
 * @param {DashPlatformProtocol} transactionalDpp
 * @param {DriveStateRepository|CachedStateRepositoryDecorator} transactionalStateRepository
 * @param {createMasternodeIdentity} createMasternodeIdentity
 * @param {createRewardShareDocument} createRewardShareDocument
 * @param {fetchTransaction} fetchTransaction
 * @return {handleNewMasternode}
 */
function handleNewMasternodeFactory(
  transactionalDpp,
  transactionalStateRepository,
  createMasternodeIdentity,
  createRewardShareDocument,
  fetchTransaction,
) {
  /**
   * @typedef handleNewMasternode
   * @param {SimplifiedMNListEntry} masternodeEntry
   * @param {DataContract} dataContract
   */
  async function handleNewMasternode(masternodeEntry, dataContract) {
    const { extraPayload: proRegTxPayload } = await fetchTransaction(masternodeEntry.proRegTxHash);

    const proRegTxHash = Buffer.from(masternodeEntry.proRegTxHash, 'hex');

    // Create a masternode identity
    const masternodeIdentityId = Identifier.from(
      hash(proRegTxHash),
    );

    const publicKey = Buffer.from(proRegTxPayload.keyIDOwner, 'hex').reverse();

    await createMasternodeIdentity(
      masternodeIdentityId,
      publicKey,
      IdentityPublicKey.TYPES.ECDSA_HASH160,
    );

    // we need to crate reward shares only if it's enabled in proRegTx

    if (proRegTxPayload.operatorReward > 0) {
      const operatorPubKey = Buffer.from(masternodeEntry.pubKeyOperator, 'hex');

      // Create an identity for operator
      const operatorIdentityHash = hash(
        Buffer.concat([
          proRegTxHash,
          operatorPubKey,
        ]),
      );

      const operatorIdentityId = Identifier.from(operatorIdentityHash);

      await createMasternodeIdentity(
        operatorIdentityId,
        operatorPubKey,
        IdentityPublicKey.TYPES.BLS12_381,
      );

      // Create a document in rewards data contract with percentage
      await createRewardShareDocument(
        dataContract,
        masternodeIdentityId,
        operatorIdentityId,
        proRegTxPayload.operatorReward,
      );
    }
  }

  return handleNewMasternode;
}

module.exports = handleNewMasternodeFactory;
