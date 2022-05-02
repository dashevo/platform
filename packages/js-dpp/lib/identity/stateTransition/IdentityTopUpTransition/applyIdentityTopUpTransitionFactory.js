const { convertSatoshiToCredits } = require('../../creditsConverter');

/**
 * @param {StateRepository} stateRepository
 * @param {fetchAssetLockTransactionOutput} fetchAssetLockTransactionOutput
 *
 * @returns {applyIdentityTopUpTransition}
 */
function applyIdentityTopUpTransitionFactory(
  stateRepository,
  fetchAssetLockTransactionOutput,
) {
  /**
   * Apply identity state transition
   *
   * @typedef applyIdentityTopUpTransition
   *
   * @param {IdentityTopUpTransition} stateTransition
   *
   * @return {Promise<void>}
   */
  async function applyIdentityTopUpTransition(stateTransition) {
    const executionContext = stateTransition.getExecutionContext();

    const output = await fetchAssetLockTransactionOutput(
      stateTransition.getAssetLockProof(),
      executionContext,
    );

    const outPoint = stateTransition.getAssetLockProof().getOutPoint();

    const creditsAmount = convertSatoshiToCredits(output.satoshis);

    const identityId = stateTransition.getIdentityId();

    const identity = await stateRepository.fetchIdentity(identityId, executionContext);

    identity.increaseBalance(creditsAmount);

    await stateRepository.storeIdentity(identity, executionContext);

    await stateRepository.markAssetLockTransactionOutPointAsUsed(outPoint, executionContext);
  }

  return applyIdentityTopUpTransition;
}

module.exports = applyIdentityTopUpTransitionFactory;
