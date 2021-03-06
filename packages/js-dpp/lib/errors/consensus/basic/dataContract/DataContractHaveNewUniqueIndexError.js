const AbstractBasicError = require('../AbstractBasicError');

class DataContractHaveNewUniqueIndexError extends AbstractBasicError {
  /**
   * @param {string} documentType
   * @param {string} indexName
   */
  constructor(documentType, indexName) {
    super(`Document with type ${documentType} has a new unique index named "${indexName}". Adding unique indices during Data Contract update is not allowed.`);

    this.documentType = documentType;
    this.indexName = indexName;

    // eslint-disable-next-line prefer-rest-params
    this.setConstructorArguments(arguments);
  }

  /**
   * Get document type with changed indices
   *
   * @returns {string}
   */
  getDocumentType() {
    return this.documentType;
  }

  /**
   * Get unique index name
   *
   * @returns {string}
   */
  getIndexName() {
    return this.indexName;
  }
}

module.exports = DataContractHaveNewUniqueIndexError;
