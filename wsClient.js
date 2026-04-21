const { Connection, PublicKey } = require('@solana/web3.js');
const config = require('./config');

class WsClient {
  constructor() {
    this.connection = null;
    this.subscriptionId = null;
    this.messageHandler = null;
    this.errorHandler = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      console.log('Connecting to WebSocket endpoint:', config.websocket.endpoint);
      
      this.connection = new Connection(config.websocket.endpoint, {
        wsEndpoint: config.websocket.endpoint,
        commitment: 'confirmed'
      });
      
      this.isConnected = true;
      console.log('WebSocket connected successfully');
      
      return true;
    } catch (error) {
      console.error('WebSocket connection error:', error.message);
      if (this.errorHandler) {
        this.errorHandler(error);
      }
      return false;
    }
  }

  async subscribeToAccount(accountPublicKey, commitment = 'confirmed') {
    if (!this.connection || !this.isConnected) {
      throw new Error('WebSocket client not connected');
    }

    try {
      const pubkey = new PublicKey(accountPublicKey);
      
      this.subscriptionId = this.connection.onAccountChange(
        pubkey,
        (accountInfo, context) => {
          if (this.messageHandler) {
            this.messageHandler({
              type: 'account',
              data: accountInfo,
              slot: context.slot,
              timestamp: Date.now()
            });
          }
        },
        commitment
      );

      console.log(`WebSocket subscribed to account: ${accountPublicKey}`);
      return true;
    } catch (error) {
      console.error('WebSocket subscription error:', error.message);
      if (this.errorHandler) {
        this.errorHandler(error);
      }
      return false;
    }
  }

  async subscribeToSlots() {
    if (!this.connection || !this.isConnected) {
      throw new Error('WebSocket client not connected');
    }

    try {
      this.subscriptionId = this.connection.onSlotUpdate((slotUpdate) => {
        if (this.messageHandler) {
          this.messageHandler({
            type: 'slot',
            slot: slotUpdate.slot,
            slotType: slotUpdate.type,
            timestamp: Date.now()
          });
        }
      });

      console.log('WebSocket subscribed to slot updates');
      return true;
    } catch (error) {
      console.error('WebSocket slot subscription error:', error.message);
      if (this.errorHandler) {
        this.errorHandler(error);
      }
      return false;
    }
  }

  onMessage(handler) {
    this.messageHandler = handler;
  }

  onError(handler) {
    this.errorHandler = handler;
  }

  async disconnect() {
    try {
      if (this.subscriptionId !== null && this.connection) {
        await this.connection.removeAccountChangeListener(this.subscriptionId);
      }
      
      this.isConnected = false;
      console.log('WebSocket disconnected');
    } catch (error) {
      console.error('WebSocket disconnect error:', error.message);
    }
  }
}

module.exports = WsClient;
