const { hasMethod } = require('../../../utils');

const { REHYDRATE_STATE_FAILED, REHYDRATE_STATE_SUCCESS } = require('../../../EVENTS');

const logger = require('../../../logger');
const WalletStore = require("../../WalletStore/WalletStore");
const ChainStore = require("../../ChainStore/ChainStore");

const castItemTypes = (item, schema) => {
  Object.entries(schema).forEach(([schemaKey, schemaValue]) => {
    if (schemaValue.constructor.name !== 'Object') {
      const Clazz = schemaValue;
      if (schemaKey === '*') {
        Object.keys(item).forEach((itemKey) => {
          // eslint-disable-next-line no-param-reassign2
          item[itemKey] = new Clazz(item[itemKey]);
        });
      } else {
        if (!item[schemaKey]) {
          throw new Error(`No schema key "${schemaKey}" found for item ${JSON.stringify(item)}`);
        }

        // eslint-disable-next-line no-param-reassign
        if (!(['string', 'number'].includes(schemaValue))) {
          item[schemaKey] = new Clazz(item[schemaKey]);
        }
      }
    } else if (schemaKey === '*') {
      Object.values(item).forEach((itemValue) => castItemTypes(itemValue, schemaValue));
    } else {
      castItemTypes(item[schemaKey], schemaValue);
    }
  });

  return item;
};

/**
 * Fetch the state from the persistence adapter
 * @return {Promise<void>}
 */
const rehydrateState = async function rehydrateState() {
  if (this.rehydrate && this.lastRehydrate === null) {
    try {
      if (this.adapter && hasMethod(this.adapter, 'getItem')) {
        const wallets = await this.adapter.getItem('wallets');
        if (wallets) {
          Object.keys(wallets).forEach((walletId) => {
            castItemTypes(wallets[walletId], WalletStore.SCHEMA)

            const walletStore = this.getWalletStore(walletId);
            if (walletStore) {
              walletStore.importState(wallets[walletId]);
            }
          });
        }

        const chains = await this.adapter.getItem('chains');
        if (chains) {
          Object.keys(chains).forEach((chainNetwork) => {
            castItemTypes(chains[chainNetwork], ChainStore.SCHEMA)

            const chainStore = this.getChainStore(chainNetwork);
            if (chainStore) {
              chainStore.importState(chains[chainNetwork]);
            }
          });
        }
      }

      this.lastRehydrate = +new Date();
      this.emit(REHYDRATE_STATE_SUCCESS, { type: REHYDRATE_STATE_SUCCESS, payload: null });
    } catch (e) {
      logger.error('Error rehydrating storage state', e);
      this.emit(REHYDRATE_STATE_FAILED, { type: REHYDRATE_STATE_FAILED, payload: e });
      throw e;
    }
  }
};
module.exports = rehydrateState;
