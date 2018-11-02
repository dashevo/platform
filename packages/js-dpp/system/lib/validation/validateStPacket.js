const Ajv = require('ajv');

const dashSchema = require('../../../dash-schema/schema/schema');
const stPacketSchema = require('../../schema/st-packet');
const dapObjectBaseSchema = require('../../schema/base/dap-object');
const dapContractMetaSchema = require('../../schema/meta/dap-contract');

const validateDapObject = require('./validateDapObject');

module.exports = function validateStPacket(packet, dapContract) {
  const ajv = new Ajv();

  ajv.addMetaSchema(dashSchema);

  ajv.addSchema(stPacketSchema);
  ajv.addSchema(dapObjectBaseSchema);
  ajv.addMetaSchema(dapContractMetaSchema);

  ajv.addSchema(dapContract, 'dap-contract');

  // TODO If contract contains wrong $schema?

  ajv.validate(
    'https://schema.dash.org/platform-4-0-0/system/st-packet',
    packet,
  );

  if (ajv.errors) {
    return ajv.errors;
  }

  // TODO Validate by schema
  let allErrors = [];
  for (const object of packet.objects) {
    const errors = validateDapObject(object, dapContract);

    if (errors) {
      allErrors = allErrors.concat(errors);
    }
  }

  if (allErrors.length) {
    return allErrors;
  }

  return null;
};