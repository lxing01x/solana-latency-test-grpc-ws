const { YellowstoneGrpc } = require('@triton-one/yellowstone-grpc');
const { PublicKey } = require('@solana/web3.js');
const config = require('./config');

class GrpcClient {
  constructor() {
    this.client = null;
    this.subscriptionId = null;
    this.messageHandler = null;
    this.errorHandler = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      console.log('Connecting to gRPC endpoint:', config.grpc.endpoint);
      
      const options = {};
      if (config.grpc.token) {
        options.xToken = config.grpc.token;
      }
      
      this.client = new YellowstoneGrpc(config.grpc.endpoint, options);
      
      await this.client.connect();
      this.isConnected = true;
      console.log('gRPC connected successfully');
      
      return true;
    } catch (error) {
      console.error('gRPC connection error:', error.message);
      if (this.errorHandler) {
        this.errorHandler(error);
      }
      return false;
    }
  }

  async subscribeToAccount(accountPublicKey, commitment = 'confirmed') {
    if (!this.client || !this.isConnected) {
      throw new Error('gRPC client not connected');
    }

    try {
      const pubkey = new PublicKey(accountPublicKey);
      
      this.subscriptionId = await this.client.subscribe();
      
      await this.client.subscribeAccount(
        this.subscriptionId,
        pubkey,
        {
          commitment: commitment,
          owner: undefined,
          filter: undefined
        }
      );

      console.log(`gRPC subscribed to account: ${accountPublicKey}`);
      
      this.client.onAccountUpdate((account, slot) => {
        if (this.messageHandler) {
          this.messageHandler({
            type: 'account',
            data: account,
            slot: slot,
            timestamp: Date.now()
          });
        }
      });

      return true;
    } catch (error) {
      console.error('gRPC subscription error:', error.message);
      if (this.errorHandler) {
        this.errorHandler(error);
      }
      return false;
    }
  }

  async subscribeToSlots(commitment = 'confirmed') {
    if (!this.client || !this.isConnected) {
      throw new Error('gRPC client not connected');
    }

    try {
      this.subscriptionId = await this.client.subscribe();
      
      await this.client.subscribeSlot(this.subscriptionId, {
        commitment: commitment
      });

      console.log('gRPC subscribed to slot updates');
      
      this.client.onSlotUpdate((slot) => {
        if (this.messageHandler) {
          this.messageHandler({
            type: 'slot',
            slot: slot,
            timestamp: Date.now()
          });
        }
      });

      return true;
    } catch (error) {
      console.error('gRPC slot subscription error:', error.message);
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
      if (this.subscriptionId && this.client) {
        await this.client.unsubscribe(this.subscriptionId);
      }
      
      if (this.client) {
        await this.client.disconnect();
      }
      
      this.isConnected = false;
      console.log('gRPC disconnected');
    } catch (error) {
      console.error('gRPC disconnect error:', error.message);
    }
  }
}

module.exports = GrpcClient;
