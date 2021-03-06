const MissingDataContractIdError = require('../errors/consensus/basic/document/MissingDataContractIdError');
const DataContractNotPresentError = require('../errors/consensus/basic/document/DataContractNotPresentError');

const createAndValidateIdentifier = require('../identifier/createAndValidateIdentifier');

const ValidationResult = require('../validation/ValidationResult');

/**
 * @param {StateRepository} stateRepository
 * @return {fetchAndValidateDataContract}
 */
function fetchAndValidateDataContractFactory(stateRepository) {
  /**
   * @typedef fetchAndValidateDataContract
   * @param {RawDocument} rawDocument
   * @return {ValidationResult}
   */
  async function fetchAndValidateDataContract(rawDocument) {
    const result = new ValidationResult();

    if (!Object.prototype.hasOwnProperty.call(rawDocument, '$dataContractId')) {
      result.addError(
        new MissingDataContractIdError(),
      );
    }

    if (!result.isValid()) {
      return result;
    }

    const dataContractId = createAndValidateIdentifier(
      '$dataContractId',
      rawDocument.$dataContractId,
      result,
    );

    if (!result.isValid()) {
      return result;
    }

    const dataContract = await stateRepository.fetchDataContract(dataContractId);

    if (!dataContract) {
      result.addError(
        new DataContractNotPresentError(dataContractId.toBuffer()),
      );
    }

    result.setData(dataContract);

    return result;
  }

  return fetchAndValidateDataContract;
}

module.exports = fetchAndValidateDataContractFactory;
