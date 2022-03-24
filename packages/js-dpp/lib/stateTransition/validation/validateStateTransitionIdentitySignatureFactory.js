const IdentityPublicKey = require('../../identity/IdentityPublicKey');
const InvalidIdentityPublicKeyTypeError = require('../../errors/consensus/signature/InvalidIdentityPublicKeyTypeError');
const InvalidStateTransitionSignatureError = require('../../errors/consensus/signature/InvalidStateTransitionSignatureError');
const MissingPublicKeyError = require('../../errors/consensus/signature/MissingPublicKeyError');
const stateTransitionTypes = require('../stateTransitionTypes');
const InvalidIdentityPublicKeySecurityLevelError = require('../../errors/consensus/signature/InvalidIdentityPublicKeySecurityLevelError');

/**
 * Validate state transition signature
 *
 * @param {validateIdentityExistence} validateIdentityExistence
 * @returns {validateStateTransitionIdentitySignature}
 */
function validateStateTransitionIdentitySignatureFactory(
  validateIdentityExistence,
) {
  /**
   * @typedef validateStateTransitionIdentitySignature
   * @param {
   * DataContractCreateTransition|
   * DocumentsBatchTransition
   * } stateTransition
   * @returns {Promise<ValidationResult>}
   */
  async function validateStateTransitionIdentitySignature(stateTransition) {
    // Owner must exist
    const result = await validateIdentityExistence(stateTransition.getOwnerId());

    if (!result.isValid()) {
      return result;
    }

    // Signature must be valid
    const identity = result.getData();

    const publicKey = identity.getPublicKeyById(stateTransition.getSignaturePublicKeyId());

    if (!publicKey) {
      result.addError(
        new MissingPublicKeyError(stateTransition.getSignaturePublicKeyId()),
      );

      return result;
    }

    if (
      publicKey.getType() !== IdentityPublicKey.TYPES.ECDSA_SECP256K1
      && publicKey.getType() !== IdentityPublicKey.TYPES.ECDSA_HASH160
    ) {
      result.addError(
        new InvalidIdentityPublicKeyTypeError(publicKey.getType()),
      );

      return result;
    }

    // Identity can be updated only with master key
    if (
      stateTransition.getType() === stateTransitionTypes.IDENTITY_UPDATE
      && publicKey.getSecurityLevel() !== IdentityPublicKey.SECURITY_LEVELS.MASTER) {
      result.addError(
        new InvalidIdentityPublicKeySecurityLevelError(publicKey.getSecurityLevel()),
      );

      return result;
    }

    const signatureIsValid = await stateTransition.verifySignature(publicKey);

    if (!signatureIsValid) {
      result.addError(
        new InvalidStateTransitionSignatureError(stateTransition),
      );
    }

    return result;
  }

  return validateStateTransitionIdentitySignature;
}

module.exports = validateStateTransitionIdentitySignatureFactory;
