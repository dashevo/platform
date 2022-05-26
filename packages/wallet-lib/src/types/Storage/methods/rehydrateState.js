const { hasMethod } = require('../../../utils');

const { REHYDRATE_STATE_FAILED, REHYDRATE_STATE_SUCCESS } = require('../../../EVENTS');

const logger = require('../../../logger');

/**
 * Fetch the state from the persistence adapter
 * @return {Promise<void>}
 */
const rehydrateState = async function rehydrateState(walletId) {
  if (this.rehydrate && this.lastRehydrate === null) {
    try {
      if (this.adapter && hasMethod(this.adapter, 'getItem')) {
        const storage = await this.adapter.getItem(`wallet_${walletId}`);

        if (storage && storage.wallets) {
          try {
            const { wallets } = storage

            Object.keys(wallets).forEach((walletId) => {

              Object.keys(wallets[walletId]).forEach((chainNetwork) => {
                const { chain, wallet } = storage.wallets[walletId][chainNetwork];

                const chainStore = this.getChainStore(chainNetwork);

                if (chainStore) {
                  chainStore.importState(chain);
                }

                try {
                  const walletStore = this.getWalletStore(walletId);

                  if (walletStore) {
                    walletStore.importState(wallet);
                  }
                } catch (e) {
                  logger.error('Error importing wallets storage, resyncing from start', e);

                  this.adapter.setItem(`wallet_${walletId}`, null);
                }
              });
            })
          } catch (e) {
            logger.error('Error importing chains storage, resyncing from start', e);

            this.adapter.setItem(`wallet_${walletId}`, null);
          }
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
