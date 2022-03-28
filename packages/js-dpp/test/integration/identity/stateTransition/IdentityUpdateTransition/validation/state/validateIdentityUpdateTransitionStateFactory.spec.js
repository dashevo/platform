const createStateRepositoryMock = require('../../../../../../../lib/test/mocks/createStateRepositoryMock');
const validateIdentityUpdateTransitionStateFactory = require('../../../../../../../lib/identity/stateTransition/IdentityUpdateTransition/validation/state/validateIdentityUpdateTransitionStateFactory');
const getIdentityUpdateTransitionFixture = require('../../../../../../../lib/test/fixtures/getIdentityUpdateTransitionFixture');
const IdentityPublicKey = require('../../../../../../../lib/identity/IdentityPublicKey');
const getIdentityFixture = require('../../../../../../../lib/test/fixtures/getIdentityFixture');
const ValidationResult = require('../../../../../../../lib/validation/ValidationResult');
const { expectValidationError } = require('../../../../../../../lib/test/expect/expectError');
const InvalidIdentityRevisionError = require('../../../../../../../lib/errors/consensus/state/identity/InvalidIdentityRevisionError');
const IdentityPublicKeyIsReadOnlyError = require('../../../../../../../lib/errors/consensus/state/identity/IdentityPublicKeyIsReadOnlyError');
const IdentityPublicKeyDisabledAtWindowViolationError = require('../../../../../../../lib/errors/consensus/state/identity/IdentityPublicKeyDisabledAtWindowViolationError');
const InvalidIdentityPublicKeyIdError = require('../../../../../../../lib/errors/consensus/state/identity/InvalidIdentityPublicKeyIdError');
const SomeConsensusError = require('../../../../../../../lib/test/mocks/SomeConsensusError');

describe('validateIdentityUpdateTransitionStateFactory', () => {
  let validateIdentityUpdateTransitionState;
  let stateRepositoryMock;
  let stateTransition;
  let identity;
  let validatePublicKeysMock;
  let fakeTime;
  let blockTime;
  let validateRequiredPurposeAndSecurityLevelMock;

  beforeEach(async function beforeEach() {
    identity = getIdentityFixture();
    validatePublicKeysMock = this.sinonSandbox.stub()
      .returns(new ValidationResult());
    validateRequiredPurposeAndSecurityLevelMock = this.sinonSandbox.stub()
      .returns(new ValidationResult());

    stateRepositoryMock = createStateRepositoryMock(this.sinonSandbox);
    stateRepositoryMock.fetchIdentity.resolves(identity);

    blockTime = new Date().getTime() / 1000;

    const abciHeader = {
      time: {
        seconds: blockTime,
      },
    };

    stateRepositoryMock.fetchLatestPlatformBlockHeader.resolves(abciHeader);

    validateIdentityUpdateTransitionState = validateIdentityUpdateTransitionStateFactory(
      stateRepositoryMock,
      validatePublicKeysMock,
      validateRequiredPurposeAndSecurityLevelMock,
    );

    stateTransition = getIdentityUpdateTransitionFixture();
    stateTransition.setRevision(identity.getRevision() + 1);
    stateTransition.setPublicKeyIdsToDisable(undefined);
    stateTransition.setPublicKeysDisabledAt(undefined);

    const privateKey = '9b67f852093bc61cea0eeca38599dbfba0de28574d2ed9b99d10d33dc1bde7b2';

    await stateTransition.signByPrivateKey(privateKey, IdentityPublicKey.TYPES.ECDSA_SECP256K1);

    fakeTime = this.sinonSandbox.useFakeTimers(new Date());
  });

  afterEach(() => {
    fakeTime.reset();
  });

  it('should return InvalidIdentityRevisionError', async () => {
    stateTransition.setRevision(identity.getRevision() + 2);

    const result = await validateIdentityUpdateTransitionState(stateTransition);

    expectValidationError(result, InvalidIdentityRevisionError);

    const [error] = result.getErrors();
    expect(error.getIdentityId()).to.deep.equal(stateTransition.getIdentityId());
    expect(error.getCurrentRevision()).to.equal(identity.getRevision());
  });

  it('should return IdentityPublicKeyIsReadOnlyError', async () => {
    identity.getPublicKeyById(0).setReadOnly(true);
    stateTransition.setPublicKeyIdsToDisable([0]);

    const result = await validateIdentityUpdateTransitionState(stateTransition);

    expectValidationError(result, IdentityPublicKeyIsReadOnlyError);

    const [error] = result.getErrors();
    expect(error.getPublicKeyIndex()).to.equal(0);
  });

  it('should return invalid result if disabledAt have violated time window', async () => {
    stateTransition.setPublicKeyIdsToDisable([1]);
    stateTransition.setPublicKeysDisabledAt(new Date());

    const timeWindowStart = new Date(blockTime * 1000);
    timeWindowStart.setMinutes(
      timeWindowStart.getMinutes() - 5,
    );

    const timeWindowEnd = new Date(blockTime * 1000);
    timeWindowEnd.setMinutes(
      timeWindowEnd.getMinutes() + 5,
    );

    stateTransition.publicKeysDisabledAt.setMinutes(
      stateTransition.publicKeysDisabledAt.getMinutes() - 6,
    );

    const result = await validateIdentityUpdateTransitionState(stateTransition);

    expectValidationError(result, IdentityPublicKeyDisabledAtWindowViolationError);

    const [error] = result.getErrors();
    expect(error.getDisabledAt()).to.deep.equal(stateTransition.publicKeysDisabledAt);
    expect(error.getTimeWindowStart()).to.deep.equal(timeWindowStart);
    expect(error.getTimeWindowEnd()).to.deep.equal(timeWindowEnd);
  });

  it('should throw InvalidIdentityPublicKeyIdError', async () => {
    stateTransition.setPublicKeyIdsToDisable([3]);
    stateTransition.setPublicKeysDisabledAt(new Date());

    const result = await validateIdentityUpdateTransitionState(stateTransition);

    expectValidationError(result, InvalidIdentityPublicKeyIdError);

    const [error] = result.getErrors();
    expect(error.getId()).to.equal(3);
  });

  it('should pass when disable public key', async () => {
    stateTransition.setPublicKeyIdsToDisable([1]);
    stateTransition.setPublicKeysDisabledAt(new Date());
    stateTransition.setPublicKeysToAdd(undefined);

    const result = await validateIdentityUpdateTransitionState(stateTransition);

    expect(result.isValid()).to.be.true();

    expect(stateRepositoryMock.fetchIdentity)
      .to.be.calledOnceWithExactly(stateTransition.getIdentityId());

    expect(stateRepositoryMock.fetchLatestPlatformBlockHeader)
      .to.be.calledOnce();
  });

  it('should pass when add public key', async () => {
    stateTransition.setPublicKeyIdsToDisable(undefined);
    stateTransition.setPublicKeysDisabledAt(undefined);

    const result = await validateIdentityUpdateTransitionState(stateTransition);

    expect(result.isValid()).to.be.true();

    expect(stateRepositoryMock.fetchIdentity)
      .to.be.calledOnceWithExactly(stateTransition.getIdentityId());

    expect(stateRepositoryMock.fetchLatestPlatformBlockHeader)
      .to.not.be.called();

    expect(validatePublicKeysMock).to.be.calledTwice();

    expect(validatePublicKeysMock.getCall(0))
      .to.be.calledWithExactly(
        stateTransition.getPublicKeysToAdd()
          .map((pk) => pk.toObject()),
        true,
      );

    expect(validatePublicKeysMock.getCall(1))
      .to.be.calledWithExactly(
        [...identity.getPublicKeys(), ...stateTransition.getPublicKeysToAdd()]
          .map((pk) => pk.toObject()),

      );
  });

  it('should pass when add and disable public keys', async () => {
    stateTransition.setPublicKeyIdsToDisable([1]);
    stateTransition.setPublicKeysDisabledAt(new Date());

    const result = await validateIdentityUpdateTransitionState(stateTransition);

    expect(result.isValid()).to.be.true();

    expect(stateRepositoryMock.fetchIdentity)
      .to.be.calledOnceWithExactly(stateTransition.getIdentityId());

    expect(stateRepositoryMock.fetchLatestPlatformBlockHeader)
      .to.be.calledOnce();

    expect(stateRepositoryMock.fetchLatestPlatformBlockHeader)
      .to.be.calledOnce();
  });

  it('should validate purpose and security level', async () => {
    const now = new Date();

    stateTransition.setPublicKeyIdsToDisable([1]);
    stateTransition.setPublicKeysDisabledAt(now);

    const publicKeysError = new SomeConsensusError('test');

    validateRequiredPurposeAndSecurityLevelMock.onCall(0)
      .returns(new ValidationResult([publicKeysError]));

    const result = await validateIdentityUpdateTransitionState(stateTransition);

    expectValidationError(result, SomeConsensusError);

    expect(validateRequiredPurposeAndSecurityLevelMock).to.be.calledOnceWithExactly([
      identity.getPublicKeys()[0].toObject(),
      { ...identity.getPublicKeys()[1].toObject(), disabledAt: now.getTime() },
      stateTransition.getPublicKeysToAdd()[0].toObject(),
    ]);
  });

  it('should validate public keys to add', async () => {
    const publicKeysError = new SomeConsensusError('test');

    validatePublicKeysMock.onCall(0).returns(new ValidationResult([publicKeysError]));

    const result = await validateIdentityUpdateTransitionState(stateTransition);

    expectValidationError(result, SomeConsensusError);

    expect(validatePublicKeysMock).to.be.calledOnceWithExactly(
      stateTransition.getPublicKeysToAdd().map((pk) => pk.toObject()),
      true,
    );
  });

  it('should validate resulting identity public keys', async () => {
    const publicKeysError = new SomeConsensusError('test');

    validatePublicKeysMock.onCall(1).returns(new ValidationResult([publicKeysError]));

    const result = await validateIdentityUpdateTransitionState(stateTransition);

    expectValidationError(result, SomeConsensusError);

    expect(validatePublicKeysMock).to.be.calledTwice();

    expect(validatePublicKeysMock.getCall(0)).to.be.calledWithExactly(
      stateTransition.getPublicKeysToAdd().map((pk) => pk.toObject()),
      true,
    );

    const publicKeys = [...identity.getPublicKeys(), ...stateTransition.getPublicKeysToAdd()];

    expect(validatePublicKeysMock.getCall(1)).to.be.calledWithExactly(
      publicKeys.map((pk) => pk.toObject()),
    );
  });
});
