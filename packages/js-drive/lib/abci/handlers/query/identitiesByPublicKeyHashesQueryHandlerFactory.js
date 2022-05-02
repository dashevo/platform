const {
  tendermint: {
    abci: {
      ResponseQuery,
    },
  },
} = require('@dashevo/abci/types');

const cbor = require('cbor');

const {
  v0: {
    GetIdentitiesByPublicKeyHashesResponse,
    ResponseMetadata,
  },
} = require('@dashevo/dapi-grpc');

const Identifier = require('@dashevo/dpp/lib/identifier/Identifier');
const InvalidArgumentAbciError = require('../../errors/InvalidArgumentAbciError');
const UnimplementedAbciError = require('../../errors/UnimplementedAbciError');

/**
 *
 * @param {PublicKeyToIdentityIdStoreRepository} signedPublicKeyToIdentityIdRepository
 * @param {IdentityStoreRepository} signedIdentityRepository
 * @param {number} maxIdentitiesPerRequest
 * @param {createQueryResponse} createQueryResponse
 * @param {BlockExecutionContextStack} blockExecutionContextStack
 * @return {identitiesByPublicKeyHashesQueryHandler}
 */
function identitiesByPublicKeyHashesQueryHandlerFactory(
  signedPublicKeyToIdentityIdRepository,
  signedIdentityRepository,
  maxIdentitiesPerRequest,
  createQueryResponse,
  blockExecutionContextStack,
) {
  /**
   * @typedef identitiesByPublicKeyHashesQueryHandler
   * @param {Object} params
   * @param {Object} data
   * @param {Buffer[]} data.publicKeyHashes
   * @param {RequestQuery} request
   * @return {Promise<ResponseQuery>}
   */
  async function identitiesByPublicKeyHashesQueryHandler(params, { publicKeyHashes }, request) {
    if (publicKeyHashes && publicKeyHashes.length > maxIdentitiesPerRequest) {
      throw new InvalidArgumentAbciError(
        `Maximum number of ${maxIdentitiesPerRequest} requested items exceeded.`, {
          maxIdentitiesPerRequest,
        },
      );
    }

    // There is no signed state (current committed block height less than 3)
    if (!blockExecutionContextStack.getLast()) {
      const response = new GetIdentitiesByPublicKeyHashesResponse();

      response.setIdentitiesList(publicKeyHashes.map(() => cbor.encode([])));
      response.setMetadata(new ResponseMetadata());

      return new ResponseQuery({
        value: response.serializeBinary(),
      });
    }

    if (request.prove) {
      throw new UnimplementedAbciError('Proofs are not implemented yet');
    }

    const response = createQueryResponse(GetIdentitiesByPublicKeyHashesResponse, request.prove);

    const identityIds = (await Promise.all(
      publicKeyHashes.map((publicKeyHash) => (
        signedPublicKeyToIdentityIdRepository.fetchBuffer(publicKeyHash)
      )),
    )).map((result) => result.getValue());

    const foundIdentityIds = [];

    for (let i = 0; i < identityIds.length; i++) {
      if (identityIds[i]) {
        // If identity was found, we need to request ordinary identity proof by id
        const ids = cbor.decode(identityIds[i]);

        ids.forEach((id) => foundIdentityIds.push(id));
      }
    }

    const identityBuffers = await Promise.all(
      identityIds.map(async (serializedIds) => {
        if (!serializedIds) {
          return cbor.encode([]);
        }

        const ids = cbor.decode(serializedIds);

        const identities = await Promise.all(
          ids.map(async (id) => {
            const identityResult = await signedIdentityRepository.fetch(
              Identifier.from(id),
            );

            return identityResult.getValue().toBuffer();
          }),
        );

        return cbor.encode(identities);
      }),
    );

    response.setIdentitiesList(identityBuffers);

    return new ResponseQuery({
      value: response.serializeBinary(),
    });
  }

  return identitiesByPublicKeyHashesQueryHandler;
}

module.exports = identitiesByPublicKeyHashesQueryHandlerFactory;
