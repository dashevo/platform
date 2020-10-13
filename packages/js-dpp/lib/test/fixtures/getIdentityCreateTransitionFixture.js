const IdentityCreateTransition = require('../../identity/stateTransitions/identityCreateTransition/IdentityCreateTransition');

const IdentityPublicKey = require('../../identity/IdentityPublicKey');

const stateTransitionTypes = require('../../stateTransition/stateTransitionTypes');

/**
 *
 * @return {IdentityCreateTransition}
 */
module.exports = function getIdentityCreateTransitionFixture() {
  const rawStateTransition = {
    protocolVersion: 0,
    type: stateTransitionTypes.IDENTITY_CREATE,
    lockedOutPoint: Buffer.alloc(36),
    publicKeys: [
      {
        id: 0,
        type: IdentityPublicKey.TYPES.ECDSA_SECP256K1,
        data: Buffer.from('AuryIuMtRrl/VviQuyLD1l4nmxi9ogPzC9LT7tdpo0di', 'base64'),
      },
    ],
  };

  return new IdentityCreateTransition(rawStateTransition);
};