const generateRandomIdentifier = require('@dashevo/dpp/lib/test/utils/generateRandomIdentifier');
const DataContractFactory = require('@dashevo/dpp/lib/dataContract/DataContractFactory');
const createDPPMock = require('@dashevo/dpp/lib/test/mocks/createDPPMock');
const createTestDIContainer = require('../../../lib/test/createTestDIContainer');
const WhereConditionPropertiesNumberError = require('../../../lib/document/query/errors/WhereConditionPropertiesNumberError');
const InOperatorAllowedOnlyForLastTwoIndexedPropertiesError = require('../../../lib/document/query/errors/InOperatorAllowedOnlyForLastTwoIndexedPropertiesError');
const ConflictingConditionsError = require('../../../lib/document/query/errors/ConflictingConditionsError');
const NotIndexedPropertiesInWhereConditionsError = require('../../../lib/document/query/errors/NotIndexedPropertiesInWhereConditionsError');
const RangeOperatorAllowedOnlyForLastTwoWhereConditionsError = require('../../../lib/document/query/errors/RangeOperatorAllowedOnlyForLastTwoWhereConditionsError');
const MultipleRangeOperatorsError = require('../../../lib/document/query/errors/MultipleRangeOperatorsError');
const RangePropertyDoesNotHaveOrderByError = require('../../../lib/document/query/errors/RangePropertyDoesNotHaveOrderByError');
const InvalidOrderByPropertiesOrderError = require('../../../lib/document/query/errors/InvalidOrderByPropertiesOrderError');
const InvalidQueryError = require('../../../lib/document/errors/InvalidQueryError');
const StorageResult = require('../../../lib/storage/StorageResult');

const validQueries = [
  {
    where: [['$id', 'in', [
      generateRandomIdentifier(),
      generateRandomIdentifier(),
      generateRandomIdentifier(),
    ]]],
    orderBy: [['$id', 'asc']],
  },
  {
    where: [
      ['a', '==', 1],
      ['b', '==', 2],
      ['c', '==', 3],
      ['d', 'in', [1, 2]],
    ],
    orderBy: [
      ['d', 'desc'],
      ['e', 'asc'],
    ],
  },
  {
    where: [
      ['a', '==', 1],
      ['b', '==', 2],
      ['c', '==', 3],
      ['d', 'in', [1, 2]],
      ['e', '>', 3],
    ],
    orderBy: [
      ['d', 'desc'],
      ['e', 'asc'],
    ],
  },
  {
    where: [
      ['firstName', '>', 'Chris'],
      ['firstName', '<=', 'Noellyn'],
    ],
    orderBy: [
      ['firstName', 'asc'],
    ],
  },
];

const invalidQueries = [
  {
    query: {
      where: [
        ['a', '==', 1],
        ['b', '==', 2],
      ],
    },
    errorClass: WhereConditionPropertiesNumberError,
  },
  {
    query: {
      where: [
        ['a', '==', 1],
        ['b', '==', 2],
        ['c', 'in', [1, 2]],
      ],
      orderBy: [
        ['c', 'desc'],
      ],
    },
    errorClass: InOperatorAllowedOnlyForLastTwoIndexedPropertiesError,
  },
  {
    query: {
      where: [
        ['a', '==', 1],
        ['b', '==', 2],
        ['b', 'in', [1, 2]],
      ],
      orderBy: [
        ['b', 'desc'],
      ],
    },
    errorClass: ConflictingConditionsError,
  },
  {
    query: {
      where: [
        ['z', '==', 1],
      ],
    },
    errorClass: NotIndexedPropertiesInWhereConditionsError,
  },
  {
    query: {
      where: [
        ['a', '==', 1],
        ['b', '==', 2],
        ['c', '>', 3],
        ['d', 'in', [1, 2]],
        ['e', '>', 3],
      ],
    },
    errorClass: RangeOperatorAllowedOnlyForLastTwoWhereConditionsError,
  },
  {
    query: {
      where: [
        ['a', '==', 1],
        ['b', '==', 2],
        ['c', '>', 3],
        ['d', '>', 3],
      ],
      orderBy: [
        ['c', 'asc'],
        ['d', 'desc'],
      ],
    },
    errorClass: MultipleRangeOperatorsError,
  },
  {
    query: {
      where: [
        ['a', '==', 3],
        ['b', '==', 2],
        ['c', '>', 1],
      ],
    },
    errorClass: RangePropertyDoesNotHaveOrderByError,
  },
  {
    query: {
      where: [
        ['a', '==', 3],
        ['b', '==', 2],
        ['c', '==', 3],
        ['d', 'in', [1, 2]],
        ['e', '<', 1],
      ],
      orderBy: [
        ['e', 'asc'],
        ['d', 'asc'],
      ],
    },
    errorClass: InvalidOrderByPropertiesOrderError,
  },
];

const malformedQueries = [
  'abc',
  {},
  [],
  { where: [1, 2, 3] },
  { invalid: 'query' },
];

describe('validate RS Drive query', () => {
  let container;
  let dataContract;
  let documentRepository;

  before(async () => {
    container = await createTestDIContainer();

    const rawDocuments = {
      testDocument: {
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
          },
          lastName: {
            type: 'string',
          },
          a: {
            type: 'integer',
          },
          b: {
            type: 'integer',
          },
          c: {
            type: 'integer',
          },
          d: {
            type: 'integer',
          },
          e: {
            type: 'integer',
          },
        },
        // required: ['$createdAt'],
        additionalProperties: false,
        indices: [
          {
            name: 'one',
            properties: [
              { firstName: 'asc' },
            ],
          },
          {
            name: 'two',
            properties: [
              { a: 'asc' },
              { b: 'asc' },
              { c: 'asc' },
              { d: 'asc' },
              { e: 'asc' },
            ],
          },
        ],
      },
    };

    const factory = new DataContractFactory(createDPPMock(), () => {});

    const ownerId = generateRandomIdentifier();
    dataContract = factory.create(ownerId, rawDocuments);

    documentRepository = container.resolve('documentRepository');

    const createInitialStateStructure = container.resolve('createInitialStateStructure');
    await createInitialStateStructure();
    const dataContractRepository = container.resolve('dataContractRepository');

    await dataContractRepository.store(dataContract);
  });

  after(async () => {
    if (container) {
      await container.dispose();
    }
  });

  describe('valid queries', () => {
    validQueries.forEach((query) => {
      it(`should return valid result for query "${JSON.stringify(query)}"`, async () => {
        const result = await documentRepository.find(dataContract, 'testDocument', query);

        expect(result).to.be.instanceOf(StorageResult);
      });
    });
  });

  describe('invalid queries', () => {
    invalidQueries.forEach(({ query, errorClass }) => {
      it(`should return invalid result with "${errorClass.name}" error for query "${JSON.stringify(query)}"`, async () => {
        try {
          await documentRepository.find(dataContract, 'testDocument', query);

          expect.fail('should throw an error');
        } catch (e) {
          expect(e).to.be.instanceOf(InvalidQueryError);
        }
      });
    });
  });

  describe('malformed queries', () => {
    malformedQueries.forEach((query) => {
      it(`should test query: ${JSON.stringify(query)}`, async () => {
        try {
          await documentRepository.find(
            dataContract,
            'testDocument',
            query,
          );

          expect.fail(`should throw error! query: "${JSON.stringify(query, null, 2)}"`);
        } catch (e) {
          expect(e).to.be.instanceOf(InvalidQueryError);
        }
      });
    });
  });
});
