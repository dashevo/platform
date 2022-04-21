const identityUpdateTransitionSchema = require('../../../../../../schema/identity/stateTransition/identityUpdate.json');
const convertBuffersToArrays = require('../../../../../util/convertBuffersToArrays');
const Script = require('@dashevo/dashcore-lib/lib/script');
const InvalidSignatureScriptError = require('../../../../../errors/consensus/signature/InvalidSignatureScriptError');

/**
 * @param {JsonSchemaValidator} jsonSchemaValidator
 * @param {validateProtocolVersion} validateProtocolVersion
 * @param {validatePublicKeys} validatePublicKeys
 * @param {validatePublicKeySignatures} validatePublicKeySignatures
 *
 * @return {validateIdentityUpdateTransitionBasic}
 */
function validateIdentityUpdateTransitionBasicFactory(
  jsonSchemaValidator,
  validateProtocolVersion,
  validatePublicKeys,
  validatePublicKeySignatures,
) {
  /**
   * @typedef validateIdentityUpdateTransitionBasic
   * @param {RawIdentityUpdateTransition} rawStateTransition
   * @return {Promise<ValidationResult>}
   */
  async function validateIdentityUpdateTransitionBasic(rawStateTransition) {
    const result = jsonSchemaValidator.validate(
      identityUpdateTransitionSchema,
      convertBuffersToArrays(rawStateTransition),
    );

    if (!result.isValid()) {
      return result;
    }

    result.merge(
      validateProtocolVersion(rawStateTransition.protocolVersion),
    );

    if (!result.isValid()) {
      return result;
    }

    if (rawStateTransition.addPublicKeys) {
      result.merge(
        validatePublicKeys(rawStateTransition.addPublicKeys),
      );

      if (!result.isValid()) {
        return result;
      }

      result.merge(
        await validatePublicKeySignatures(rawStateTransition, rawStateTransition.addPublicKeys),
      );
    }

    if (!result.isValid()) {
      return result;
    }

    if (rawStateTransition.signatureScript) {
      const signatureScript = new Script(rawStateTransition.signatureScript);
      const address = signatureScript.toAddress();

      if (!address || !address.isPayToScriptHash()) {
        result.addError(
          new InvalidSignatureScriptError(rawStateTransition.signatureScript),
        );
      }
    }

    return result;
  }

  return validateIdentityUpdateTransitionBasic;
}

module.exports = validateIdentityUpdateTransitionBasicFactory;
