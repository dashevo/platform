const ValidationResult = require('../../../../../validation/ValidationResult');
const InvalidIdentityRevisionError = require('../../../../../errors/consensus/state/identity/InvalidIdentityRevisionError');
const IdentityPublicKeyIsReadOnlyError = require('../../../../../errors/consensus/state/identity/IdentityPublicKeyIsReadOnlyError');
const InvalidIdentityPublicKeyIdError = require('../../../../../errors/consensus/state/identity/InvalidIdentityPublicKeyIdError');
const Identity = require('../../../../Identity');
const IdentityPublicKeyDisabledAtWindowViolationError = require('../../../../../errors/consensus/state/identity/IdentityPublicKeyDisabledAtWindowViolationError');

const BLOCK_TIME_WINDOW_MINUTES = 5;

/**
 * @param {StateRepository} stateRepository
 * @param {validatePublicKeys} validatePublicKeys
 * @param {validateRequiredPurposeAndSecurityLevel} validateRequiredPurposeAndSecurityLevel
 * @return {validateIdentityUpdateTransitionState}
 */
function validateIdentityUpdateTransitionStateFactory(
  stateRepository,
  validatePublicKeys,
  validateRequiredPurposeAndSecurityLevel,
) {
  /**
   * @typedef {validateIdentityUpdateTransitionState}
   * @param {IdentityUpdateTransition} stateTransition
   * @return {Promise<ValidationResult>}
   */
  // eslint-disable-next-line no-unused-vars
  async function validateIdentityUpdateTransitionState(stateTransition) {
    const result = new ValidationResult();

    const identityId = stateTransition.getIdentityId();
    const storedIdentity = await stateRepository.fetchIdentity(identityId);

    // copy identity
    const identity = (new Identity(storedIdentity.toObject()));

    // Check revision
    if (identity.getRevision() !== stateTransition.getRevision() - 1) {
      result.addError(
        new InvalidIdentityRevisionError(identityId.toBuffer(), identity.getRevision()),
      );
    }

    const disablePublicKeys = stateTransition.getPublicKeyIdsToDisable();

    if (disablePublicKeys) {
      disablePublicKeys.forEach((id) => {
        if (!identity.getPublicKeyById(id)) {
          result.addError(
            new InvalidIdentityPublicKeyIdError(id),
          );
        } else if (identity.getPublicKeyById(id).getReadOnly()) {
          result.addError(
            new IdentityPublicKeyIsReadOnlyError(id),
          );
        }
      });

      if (!result.isValid()) {
        return result;
      }

      // Keys can only be disabled if another valid key is enabled in the same security level
      disablePublicKeys.forEach(
        (id) => identity.getPublicKeyById(id)
          .setDisabledAt(stateTransition.getPublicKeysDisabledAt()),
      );

      // Calculate time window for timestamps
      const {
        time: {
          seconds: lastBlockHeaderTimeSeconds,
        },
      } = await stateRepository.fetchLatestPlatformBlockHeader();

      // Get last block header time in milliseconds
      const lastBlockHeaderTime = lastBlockHeaderTimeSeconds * 1000;

      // Define time window
      const timeWindowStart = new Date(lastBlockHeaderTime);
      timeWindowStart.setMinutes(
        timeWindowStart.getMinutes() - BLOCK_TIME_WINDOW_MINUTES,
      );

      const timeWindowEnd = new Date(lastBlockHeaderTime);
      timeWindowEnd.setMinutes(
        timeWindowEnd.getMinutes() + BLOCK_TIME_WINDOW_MINUTES,
      );

      const disabledAtTime = stateTransition.getPublicKeysDisabledAt();

      if (disabledAtTime < timeWindowStart || disabledAtTime > timeWindowEnd) {
        result.addError(
          new IdentityPublicKeyDisabledAtWindowViolationError(
            disabledAtTime,
            timeWindowStart,
            timeWindowEnd,
          ),
        );
      }

      if (!result.isValid()) {
        return result;
      }
    }

    const addPublicKeys = stateTransition.getPublicKeysToAdd();
    if (addPublicKeys) {
      // check that all adding public keys don't contain disabledAt field
      result.merge(
        validatePublicKeys(addPublicKeys.map((pk) => pk.toObject()), true),
      );

      if (!result.isValid()) {
        return result;
      }

      const identityPublicKeys = identity.getPublicKeys();
      addPublicKeys.forEach((pk) => identityPublicKeys.push(pk));
      identity.setPublicKeys(identityPublicKeys);
    }

    identity.getPublicKeys().forEach((pk) => {
      result.merge(
        validateRequiredPurposeAndSecurityLevel(pk.toObject()),
      );
    });

    if (!result.isValid()) {
      return result;
    }

    result.merge(
      validatePublicKeys(identity.getPublicKeys().map((pk) => pk.toObject())),
    );

    return result;
  }

  return validateIdentityUpdateTransitionState;
}

module.exports = validateIdentityUpdateTransitionStateFactory;