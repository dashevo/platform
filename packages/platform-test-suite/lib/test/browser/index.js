require('./../karma/bootstrap');

// noinspection JSUnresolvedFunction
const testsContext = require.context('../../../test', true, /^.+\.spec\.js$/);

testsContext.keys()
  // Ignore proofs.spec.js because it uses Merk native Node.JS module
  .filter((path) => !path.includes('proofs.spec.js'))
  .filter((path) => !path.includes('waitForStateTransitionResult.spec.js'))
  .forEach(testsContext);