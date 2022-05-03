const { createHash } = require('crypto');
const WriteOperation = require('@dashevo/dpp/lib/stateTransition/fee/operations/WriteOperation');
const ReadOperation = require('@dashevo/dpp/lib/stateTransition/fee/operations/ReadOperation');
const DeleteOperation = require('@dashevo/dpp/lib/stateTransition/fee/operations/DeleteOperation');
const StorageResult = require('./StorageResult');

class GroveDBStore {
  /**
   * @param {Drive} rsDrive
   * @param {Object} [logger]
   */
  constructor(rsDrive, logger = undefined) {
    this.rsDrive = rsDrive;
    this.db = rsDrive.getGroveDB();
    this.logger = logger;
  }

  /**
   * Store a key
   *
   * @param {Buffer[]} path
   * @param {Buffer} key
   * @param {Buffer} value
   * @param {Object} [options]
   * @param {boolean} [options.useTransaction=false]
   * @param {boolean} [options.skipIfExists]
   * @return {Promise<StorageResult<void>>}
   */
  async put(path, key, value, options = {}) {
    const method = options.skipIfExists ? 'insertIfNotExists' : 'insert';

    try {
      await this.db[method](
        path,
        key,
        {
          type: 'item',
          value,
        },
        options.useTransaction || false,
      );
    } finally {
      if (this.logger) {
        this.logger.info({
          path: path.map((segment) => segment.toString('hex')),
          pathHash: createHash('sha256')
            .update(
              path.reduce((segment, buffer) => Buffer.concat([segment, buffer]), Buffer.alloc(0)),
            ).digest('hex'),
          key: key.toString('hex'),
          value: value.toString('hex'),
          valueHash: createHash('sha256')
            .update(value)
            .digest('hex'),
          useTransaction: Boolean(options.useTransaction),
          type: 'item',
          method,
          appHash: (await this.getRootHash(options)).toString('hex'),
        }, 'put');
      }
    }

    return new StorageResult(
      undefined,
      [new WriteOperation(key.length, value.length)],
    );
  }

  /**
   * Store a reference to the specified key
   *
   * @param {Buffer[]} path
   * @param {Buffer} key
   * @param {Buffer[]} referencePath
   * @param {Object} [options]
   * @param {boolean} [options.useTransaction=false]
   * @param {boolean} [options.skipIfExists]
   * @return {Promise<StorageResult<void>>}
   */
  async putReference(path, key, referencePath, options = {}) {
    const method = options.skipIfExists ? 'insertIfNotExists' : 'insert';

    try {
      await this.db[method](
        path,
        key,
        {
          type: 'reference',
          value: referencePath,
        },
        options.useTransaction || false,
      );
    } finally {
      if (this.logger) {
        this.logger.info({
          path: path.map((segment) => segment.toString('hex')),
          pathHash: createHash('sha256')
            .update(
              path.reduce((segment, buffer) => Buffer.concat([segment, buffer]), Buffer.alloc(0)),
            )
            .digest('hex'),
          key: key.toString('hex'),
          value: referencePath.map((segment) => segment.toString('hex')),
          valueHash: createHash('sha256')
            .update(
              referencePath.reduce((segment, buffer) => (
                Buffer.concat([segment, buffer])
              ), Buffer.alloc(0)),
            )
            .digest('hex'),
          useTransaction: Boolean(options.useTransaction),
          type: 'reference',
          method,
          appHash: (await this.getRootHash(options)).toString('hex'),
        }, 'putReference');
      }
    }

    return new StorageResult(
      undefined,
      [
        new WriteOperation(
          key.length,
          referencePath.reduce((size, pathItem) => size + pathItem.length, 0),
        ),
      ],
    );
  }

  /**
   * Create empty key
   *
   * @param {Buffer[]} path
   * @param {Buffer} key
   * @param {Object} [options]
   * @param {boolean} [options.useTransaction=false]
   * @param {boolean} [options.skipIfExists]
   * @return {Promise<StorageResult<void>>}
   */
  async createTree(path, key, options = { }) {
    const method = options.skipIfExists ? 'insertIfNotExists' : 'insert';

    try {
      await this.db[method](
        path,
        key,
        {
          type: 'tree',
          value: Buffer.alloc(32),
        },
        options.useTransaction || false,
      );
    } finally {
      if (this.logger) {
        this.logger.info({
          path: path.map((segment) => segment.toString('hex')),
          pathHash: createHash('sha256')
            .update(
              path.reduce((segment, buffer) => Buffer.concat([segment, buffer]), Buffer.alloc(0)),
            ).digest('hex'),
          key: key.toString('hex'),
          value: Buffer.alloc(32).toString('hex'),
          valueHash: createHash('sha256')
            .update(Buffer.alloc(32))
            .digest('hex'),
          useTransaction: Boolean(options.useTransaction),
          type: 'tree',
          method,
          appHash: (await this.getRootHash(options)).toString('hex'),
        }, 'createTree');
      }
    }

    return new StorageResult(
      undefined,
      [
        new WriteOperation(
          key.length,
          32,
        ),
      ],
    );
  }

  /**
   * Get a value by key
   *
   * @param {Buffer[]} path
   * @param {Buffer} key
   * @param {Object} [options]
   * @param {boolean} [options.useTransaction=false]
   * @return {Promise<StorageResult<Buffer|null>>}
   */
  async get(path, key, options = { }) {
    let type;
    let value;

    try {
      ({ type, value } = await this.db.get(
        path,
        key,
        options.useTransaction || false,
      ));
    } catch (e) {
      if (
        e.message.startsWith('path key not found')
        || e.message.startsWith('path not found')
      ) {
        return new StorageResult(
          null,
          [new ReadOperation(0)],
        );
      }

      throw e;
    }

    if (type === undefined) {
      return new StorageResult(
        null,
        [new ReadOperation(0)],
      );
    }

    if (type !== 'item') {
      throw new Error('Key should point to item element type');
    }

    return new StorageResult(
      value,
      [new ReadOperation(value.length)],
    );
  }

  /**
   * Delete value by key
   *
   * @param {Buffer[]} path
   * @param {Buffer} key
   * @param {Object} [options]
   * @param {boolean} [options.useTransaction=false]
   * @return {Promise<StorageResult<void>>}
   */
  async delete(path, key, options = {}) {
    try {
      await this.db.delete(
        path,
        key,
        options.useTransaction || false,
      );
    } finally {
      if (this.logger) {
        this.logger.info({
          path: path.map((segment) => segment.toString('hex')),
          pathHash: createHash('sha256')
            .update(
              path.reduce((segment, buffer) => Buffer.concat([segment, buffer]), Buffer.alloc(0)),
            ).digest('hex'),
          key: key.toString('hex'),
          useTransaction: Boolean(options.useTransaction),
          method: 'delete',
          appHash: (await this.getRootHash(options)).toString('hex'),
        }, 'delete');
      }
    }

    return new StorageResult(
      undefined,
      [new DeleteOperation(key.length, 0)],
    );
  }

  /**
   * Get auxiliary value by key
   *
   * @param {Buffer} key
   * @param {Object} [options]
   * @param {boolean} [options.useTransaction=false]
   * @return {Promise<StorageResult<Buffer|null>>}
   */
  async getAux(key, options = {}) {
    let result;
    try {
      result = await this.db.getAux(
        key,
        options.useTransaction || false,
      );
    } catch (e) {
      if (e.message.startsWith('path key not found')) {
        return new StorageResult(
          null,
          [
            new ReadOperation(result ? result.length : 0),
          ],
        );
      }

      throw e;
    }

    return new StorageResult(
      result,
      [
        new ReadOperation(result ? result.length : 0),
      ],
    );
  }

  /**
   * Store auxiliary value by key
   *
   * @param {Buffer} key
   * @param {Buffer} value
   * @param {Object} [options]
   * @param {boolean} [options.useTransaction=false]
   * @return {Promise<StorageResult<void>>}
   */
  async putAux(key, value, options = {}) {
    try {
      await this.db.putAux(
        key,
        value,
        options.useTransaction || false,
      );
    } finally {
      if (this.logger) {
        this.logger.info({
          key: key.toString('hex'),
          value: value.toString('hex'),
          valueHash: createHash('sha256')
            .update(value)
            .digest('hex'),
          useTransaction: Boolean(options.useTransaction),
          method: 'putAux',
          appHash: (await this.getRootHash(options)).toString('hex'),
        }, 'putAux');
      }
    }

    return new StorageResult(
      undefined,
      [
        new WriteOperation(key.length, value.length),
      ],
    );
  }

  /**
   * Delete auxiliary value by key
   *
   * @param {Buffer} key
   * @param {Object} [options]
   * @param {boolean} [options.useTransaction=false]
   * @return {Promise<StorageResult<void>>}
   */
  async deleteAux(key, options = {}) {
    try {
      await this.db.deleteAux(
        key,
        options.useTransaction || false,
      );
    } finally {
      if (this.logger) {
        this.logger.info({
          key: key.toString('hex'),
          useTransaction: Boolean(options.useTransaction),
          method: 'deleteAux',
          appHash: (await this.getRootHash(options)).toString('hex'),
        }, 'deleteAux');
      }
    }

    return new StorageResult(
      undefined,
      [
        new DeleteOperation(key.length, 0),
      ],
    );
  }

  /**
   * Get tree root hash
   *
   * @param {Object} [options]
   * @param {boolean} [options.useTransaction=false]
   * @return {Buffer}
   */
  async getRootHash(options = {}) {
    return this.db.getRootHash(options.useTransaction || false);
  }

  /**
   * @return {Promise<void>}
   */
  async startTransaction() {
    return this.db.startTransaction();
  }

  /**
   * @return {Promise<void>}
   */
  async isTransactionStarted() {
    return this.db.isTransactionStarted();
  }

  /**
   * Rollback transaction to this initial state when it was created
   *
   * @returns {Promise<void>}
   */
  async rollbackTransaction() {
    return this.db.rollbackTransaction();
  }

  /**
   * @return {Promise<void>}
   */
  async commitTransaction() {
    return this.db.commitTransaction();
  }

  /**
   * @return {Promise<void>}
   */
  async abortTransaction() {
    return this.db.abortTransaction();
  }

  /**
   * @return {Drive}
   */
  getDrive() {
    return this.rsDrive;
  }

  /**
   * @returns {GroveDB}
   */
  getDB() {
    return this.db;
  }

  /**
   * @param {GroveDB} db
   */
  setDB(db) {
    this.db = db;
  }
}

module.exports = GroveDBStore;
