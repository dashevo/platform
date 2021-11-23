const { expect, use } = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const dirtyChai = require('dirty-chai');
const chaiAsPromised = require('chai-as-promised');
const chaiString = require('chai-string');
const chaiExclude = require('chai-exclude');
const { initBlake3 } = require('../util/hash');

use(sinonChai);
use(chaiAsPromised);
use(dirtyChai);
use(chaiString);
use(chaiExclude);

before(async () => {
  await initBlake3();
});

beforeEach(function beforeEach() {
  if (!this.sinonSandbox) {
    this.sinonSandbox = sinon.createSandbox();
  } else {
    this.sinonSandbox.restore();
  }
});

afterEach(function afterEach() {
  this.sinonSandbox.restore();
});

global.expect = expect;
