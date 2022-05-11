const validateStateTransitionSignatureFactory = require('../../../../lib/stateTransition/validation/validateStateTransitionIdentitySignatureFactory');
const ValidationResult = require('../../../../lib/validation/ValidationResult');
const IdentityPublicKey = require('../../../../lib/identity/IdentityPublicKey');
const InvalidStateTransitionSignatureError = require('../../../../lib/errors/consensus/signature/InvalidStateTransitionSignatureError');
const MissingPublicKeyError = require('../../../../lib/errors/consensus/signature/MissingPublicKeyError');
const generateRandomIdentifier = require('../../../../lib/test/utils/generateRandomIdentifier');

const { expectValidationError } = require('../../../../lib/test/expect/expectError');
const SomeConsensusError = require('../../../../lib/test/mocks/SomeConsensusError');
const stateTransitionTypes = require('../../../../lib/stateTransition/stateTransitionTypes');
const StateTransitionExecutionContext = require('../../../../lib/stateTransition/StateTransitionExecutionContext');
const StateTransitionIsNotSignedError = require('../../../../lib/stateTransition/errors/StateTransitionIsNotSignedError');
const StateTransitionIsNotSignedConsensusError = require('../../../../lib/errors/consensus/signature/StateTransitionIsNotSignedError');
const PublicKeyIsDisabledConsensusError = require('../../../../lib/errors/consensus/signature/PublicKeyIsDisabledError');
const WrongPublicKeyPurposeConsensusError = require('../../../../lib/errors/consensus/signature/WrongPublicKeyPurposeError');
const PublicKeySecurityLevelNotMetConsensusError = require('../../../../lib/errors/consensus/signature/PublicKeySecurityLevelNotMetError');
const InvalidSignaturePublicKeySecurityLevelConsensusError = require('../../../../lib/errors/consensus/signature/InvalidSignaturePublicKeySecurityLevelError');
const InvalidIdentityPublicKeyTypeConsensusError = require('../../../../lib/errors/consensus/signature/InvalidIdentityPublicKeyTypeError');
const PublicKeyMismatchConsensusError = require('../../../../lib/errors/consensus/signature/PublicKeyMismatchError');
const PublicKeyMismatchError = require('../../../../lib/stateTransition/errors/PublicKeyMismatchError');
const InvalidSignaturePublicKeySecurityLevelError = require('../../../../lib/stateTransition/errors/InvalidSignaturePublicKeySecurityLevelError');
const PublicKeySecurityLevelNotMetError = require('../../../../lib/stateTransition/errors/PublicKeySecurityLevelNotMetError');
const WrongPublicKeyPurposeError = require('../../../../lib/stateTransition/errors/WrongPublicKeyPurposeError');
const PublicKeyIsDisabledError = require('../../../../lib/stateTransition/errors/PublicKeyIsDisabledError');
const DPPError = require('../../../../lib/errors/DPPError');
const InvalidIdentityPublicKeyTypeError = require('../../../../lib/stateTransition/errors/InvalidIdentityPublicKeyTypeError');

describe('validateStateTransitionIdentitySignatureFactory', () => {
  let validateStateTransitionIdentitySignature;
  let stateTransition;
  let ownerId;
  let identity;
  let identityPublicKey;
  let publicKeyId;
  let validateIdentityExistenceResult;
  let validateIdentityExistenceMock;
  let executionContext;

  beforeEach(function beforeEach() {
    executionContext = new StateTransitionExecutionContext();

    ownerId = generateRandomIdentifier();
    publicKeyId = 1;
    stateTransition = {
      verifySignature: this.sinonSandbox.stub().returns(true),
      getSignaturePublicKeyId: this.sinonSandbox.stub().returns(publicKeyId),
      getSignature: this.sinonSandbox.stub(),
      getOwnerId: this.sinonSandbox.stub().returns(ownerId),
      getType: this.sinonSandbox.stub().returns(stateTransitionTypes.IDENTITY_CREATE),
      getExecutionContext: this.sinonSandbox.stub().returns(executionContext),
    };

    identityPublicKey = {
      getType: this.sinonSandbox.stub().returns(IdentityPublicKey.TYPES.ECDSA_SECP256K1),
      getSecurityLevel: this.sinonSandbox.stub(),
    };

    const getPublicKeyById = this.sinonSandbox.stub().returns(identityPublicKey);

    identity = {
      getPublicKeyById,
    };

    validateIdentityExistenceResult = new ValidationResult();
    validateIdentityExistenceResult.setData(identity);

    validateIdentityExistenceMock = this.sinonSandbox.stub().resolves(
      validateIdentityExistenceResult,
    );

    validateStateTransitionIdentitySignature = validateStateTransitionSignatureFactory(
      validateIdentityExistenceMock,
    );
  });

  it('should pass properly signed state transition', async () => {
    const result = await validateStateTransitionIdentitySignature(
      stateTransition,
    );

    expect(result).to.be.instanceOf(ValidationResult);

    expect(result.isValid()).to.be.true();
    expect(result.getErrors()).to.be.an('array');
    expect(result.getErrors()).to.be.empty();

    expect(validateIdentityExistenceMock).to.be.calledOnceWithExactly(ownerId, executionContext);
    expect(identity.getPublicKeyById).to.be.calledOnceWithExactly(publicKeyId);
    expect(identityPublicKey.getType).to.be.calledOnce();
    expect(stateTransition.getSignaturePublicKeyId).to.be.calledOnce();
    expect(stateTransition.verifySignature).to.be.calledOnceWithExactly(identityPublicKey);
    expect(stateTransition.getOwnerId).to.be.calledOnceWithExactly();
  });

  it('should return invalid result if owner id doesn\'t exist', async () => {
    const consensusError = new SomeConsensusError('error');

    validateIdentityExistenceResult.addError(consensusError);

    const result = await validateStateTransitionIdentitySignature(
      stateTransition,
    );

    expectValidationError(result);

    const [error] = result.getErrors();

    expect(error).to.equal(consensusError);

    expect(validateIdentityExistenceMock).to.be.calledOnceWithExactly(ownerId, executionContext);
    expect(identity.getPublicKeyById).to.not.be.called();
    expect(identityPublicKey.getType).to.not.be.called();
    expect(stateTransition.getSignaturePublicKeyId).to.not.be.called();
    expect(stateTransition.verifySignature).to.not.be.called();
    expect(stateTransition.getOwnerId).to.be.calledOnceWithExactly();
  });

  it("should return MissingPublicKeyError if the identity doesn't have a matching public key", async () => {
    const type = IdentityPublicKey.TYPES.ECDSA_SECP256K1 + 1;
    identityPublicKey.getType.returns(type);
    identity.getPublicKeyById.returns(undefined);

    const result = await validateStateTransitionIdentitySignature(
      stateTransition,
    );

    expect(result).to.be.instanceOf(ValidationResult);
    expect(result.isValid()).to.be.false();
    expect(validateIdentityExistenceMock).to.be.calledOnceWithExactly(ownerId, executionContext);
    expect(identity.getPublicKeyById).to.be.calledOnceWithExactly(publicKeyId);
    expect(stateTransition.getSignaturePublicKeyId).to.be.calledTwice();
    expect(stateTransition.verifySignature).to.not.be.called();

    expect(result.getErrors()).to.be.an('array');
    expect(result.getErrors()).to.have.lengthOf(1);

    const [error] = result.getErrors();

    expect(error).to.be.instanceOf(MissingPublicKeyError);
    expect(error.getPublicKeyId()).to.equal(publicKeyId);
  });

  it('should return InvalidIdentityPublicKeyTypeError if type is not exist', async () => {
    const type = Math.max(...Object.values(IdentityPublicKey.TYPES)) + 1;
    identityPublicKey.getType.returns(type);

    const result = await validateStateTransitionIdentitySignature(
      stateTransition,
    );

    expect(result).to.be.instanceOf(ValidationResult);
    expect(result.isValid()).to.be.false();
    expect(validateIdentityExistenceMock).to.be.calledOnceWithExactly(ownerId, executionContext);
    expect(identity.getPublicKeyById).to.be.calledOnceWithExactly(publicKeyId);
    expect(identityPublicKey.getType).to.be.calledThrice();
    expect(stateTransition.getSignaturePublicKeyId).to.be.calledOnce();
    expect(stateTransition.verifySignature).to.not.be.called();

    expect(result.getErrors()).to.be.an('array');
    expect(result.getErrors()).to.have.lengthOf(1);

    const [error] = result.getErrors();

    expect(error).to.be.instanceOf(InvalidIdentityPublicKeyTypeConsensusError);
    expect(error.getPublicKeyType()).to.equal(type);
  });

  it('should return InvalidStateTransitionSignatureError if signature is invalid', async () => {
    stateTransition.verifySignature.resolves(false);

    const result = await validateStateTransitionIdentitySignature(
      stateTransition,
    );

    expect(result).to.be.instanceOf(ValidationResult);

    expect(result.isValid()).to.be.false();
    expect(result.getErrors()).to.be.an('array');
    expect(result.getErrors()).to.have.lengthOf(1);

    const [error] = result.getErrors();

    expect(error).to.be.instanceOf(InvalidStateTransitionSignatureError);

    expect(validateIdentityExistenceMock).to.be.calledOnceWithExactly(ownerId, executionContext);
    expect(identity.getPublicKeyById).to.be.calledOnceWithExactly(publicKeyId);
    expect(identityPublicKey.getType).to.be.calledOnce();
    expect(stateTransition.getSignaturePublicKeyId).to.be.calledOnce();
    expect(stateTransition.verifySignature).to.be.calledOnceWithExactly(identityPublicKey);
  });

  describe('Consensus errors', () => {
    it('should return StateTransitionIsNotSignedConsensusError if StateTransitionIsNotSignedError was thrown', async () => {
      const e = new StateTransitionIsNotSignedError(stateTransition);

      stateTransition.verifySignature.throws(e);

      const result = await validateStateTransitionIdentitySignature(
        stateTransition,
      );

      expect(result).to.be.instanceOf(ValidationResult);

      expect(result.isValid()).to.be.false();
      expect(result.getErrors()).to.be.an('array');
      expect(result.getErrors()).to.have.lengthOf(1);

      const [error] = result.getErrors();
      expect(error).to.be.instanceOf(StateTransitionIsNotSignedConsensusError);
    });

    it('should return PublicKeyMismatchConsensusError if PublicKeyMismatchError was thrown', async () => {
      const e = new PublicKeyMismatchError(identityPublicKey);

      stateTransition.verifySignature.throws(e);

      const result = await validateStateTransitionIdentitySignature(
        stateTransition,
      );

      expect(result).to.be.instanceOf(ValidationResult);

      expect(result.isValid()).to.be.false();
      expect(result.getErrors()).to.be.an('array');
      expect(result.getErrors()).to.have.lengthOf(1);

      const [error] = result.getErrors();
      expect(error).to.be.instanceOf(PublicKeyMismatchConsensusError);
      expect(error.getPublicKey()).to.deep.equal(identityPublicKey);
    });

    it('should return InvalidIdentityPublicKeyTypeConsensusError if InvalidIdentityPublicKeyTypeError was thrown', async () => {
      const e = new InvalidIdentityPublicKeyTypeError(1);

      stateTransition.verifySignature.throws(e);

      const result = await validateStateTransitionIdentitySignature(
        stateTransition,
      );

      expect(result).to.be.instanceOf(ValidationResult);

      expect(result.isValid()).to.be.false();
      expect(result.getErrors()).to.be.an('array');
      expect(result.getErrors()).to.have.lengthOf(1);

      const [error] = result.getErrors();
      expect(error).to.be.instanceOf(InvalidIdentityPublicKeyTypeConsensusError);
      expect(error.getPublicKeyType()).to.equal(1);
    });

    it('should return InvalidSignaturePublicKeySecurityLevelConsensusError if InvalidSignaturePublicKeySecurityLevelError was thrown', async () => {
      const e = new InvalidSignaturePublicKeySecurityLevelError(1);

      stateTransition.verifySignature.throws(e);

      const result = await validateStateTransitionIdentitySignature(
        stateTransition,
      );

      expect(result).to.be.instanceOf(ValidationResult);

      expect(result.isValid()).to.be.false();
      expect(result.getErrors()).to.be.an('array');
      expect(result.getErrors()).to.have.lengthOf(1);

      const [error] = result.getErrors();
      expect(error).to.be.instanceOf(InvalidSignaturePublicKeySecurityLevelConsensusError);
      expect(error.getSecurityLevel()).to.equal(1);
    });

    it('should return PublicKeySecurityLevelNotMetConsensusError if PublicKeySecurityLevelNotMetError was thrown', async () => {
      const e = new PublicKeySecurityLevelNotMetError(1, 2);

      stateTransition.verifySignature.throws(e);

      const result = await validateStateTransitionIdentitySignature(
        stateTransition,
      );

      expect(result).to.be.instanceOf(ValidationResult);

      expect(result.isValid()).to.be.false();
      expect(result.getErrors()).to.be.an('array');
      expect(result.getErrors()).to.have.lengthOf(1);

      const [error] = result.getErrors();
      expect(error).to.be.instanceOf(PublicKeySecurityLevelNotMetConsensusError);
      expect(error.getPublicKeySecurityLevel()).to.equal(1);
      expect(error.getKeySecurityLevelRequirement()).to.equal(2);
    });

    it('should return WrongPublicKeyPurposeConsensusError if WrongPublicKeyPurposeError was thrown', async () => {
      const e = new WrongPublicKeyPurposeError(4, 2);

      stateTransition.verifySignature.throws(e);

      const result = await validateStateTransitionIdentitySignature(
        stateTransition,
      );

      expect(result).to.be.instanceOf(ValidationResult);

      expect(result.isValid()).to.be.false();
      expect(result.getErrors()).to.be.an('array');
      expect(result.getErrors()).to.have.lengthOf(1);

      const [error] = result.getErrors();
      expect(error).to.be.instanceOf(WrongPublicKeyPurposeConsensusError);

      expect(error.getPublicKeyPurpose()).to.equal(4);
      expect(error.getKeyPurposeRequirement()).to.equal(2);
    });

    it('should return PublicKeyIsDisabledConsensusError if PublicKeyIsDisabledError was thrown', async () => {
      const e = new PublicKeyIsDisabledError(identityPublicKey);

      stateTransition.verifySignature.throws(e);

      const result = await validateStateTransitionIdentitySignature(
        stateTransition,
      );

      expect(result).to.be.instanceOf(ValidationResult);

      expect(result.isValid()).to.be.false();
      expect(result.getErrors()).to.be.an('array');
      expect(result.getErrors()).to.have.lengthOf(1);

      const [error] = result.getErrors();
      expect(error).to.be.instanceOf(PublicKeyIsDisabledConsensusError);
      expect(error.getPublicKey()).to.deep.equal(identityPublicKey);
    });

    it('should return InvalidStateTransitionSignatureError if DPPError was thrown', async () => {
      const e = new DPPError('Dpp error');

      stateTransition.verifySignature.throws(e);

      const result = await validateStateTransitionIdentitySignature(
        stateTransition,
      );

      expect(result).to.be.instanceOf(ValidationResult);

      expect(result.isValid()).to.be.false();
      expect(result.getErrors()).to.be.an('array');
      expect(result.getErrors()).to.have.lengthOf(1);

      const [error] = result.getErrors();
      expect(error).to.be.instanceOf(InvalidStateTransitionSignatureError);
    });

    it('should throw unknown error', async () => {
      const e = new Error('unknown error');

      stateTransition.verifySignature.throws(e);

      try {
        await validateStateTransitionIdentitySignature(
          stateTransition,
        );

        expect.fail('should throw an error');
      } catch (error) {
        expect(error).to.equal(e);
      }
    });
  });
});
