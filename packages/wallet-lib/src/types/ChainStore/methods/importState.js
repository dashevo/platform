const castItemTypes = require('../../../utils/castItemTypes');

function importState(rawState) {
  const state = castItemTypes(rawState, this.SCHEMA);

  const {
    blockHeaders,
    transactions,
    txMetadata,
  } = state;

  Object.values(blockHeaders).forEach((blockHeader) => {
    this.importBlockHeader(blockHeader);
  });

  Object.keys(transactions).forEach((hash) => {
    const tx = transactions[hash];
    const metadata = txMetadata[hash];
    this.importTransaction(tx, metadata);
  });
}

module.exports = importState;
