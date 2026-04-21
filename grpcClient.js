const Client = require('@triton-one/yellowstone-grpc').default;
const { CommitmentLevel, SubscribeRequestFilterSlots, SubscribeRequestFilterAccounts } = require('@triton-one/yellowstone-grpc');
const { PublicKey } = require('@solana/web3.js');
const config = require('./config');

class GrpcClient {
  constructor() {
    this.client = null;
    this.stream = null;
    this.messageHandler = null;
    this.errorHandler = null;
    this.isConnected = false;
    this.subscriptionCounter = 0;
  }

  async connect() {
    try {
      console.log('Connecting to gRPC endpoint:', config.grpc.endpoint);
      
      this.client = new Client(
        config.grpc.endpoint,
        config.grpc.token || undefined,
        undefined
      );
      
      try {
        const version = await this.client.getVersion();
        console.log('gRPC connected successfully, version:', version);
      } catch (versionError) {
        console.log('gRPC connection established (version check failed, but proceeding)');
      }
      
      this.isConnected = true;
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
      
      const commitmentLevel = this._getCommitmentLevel(commitment);
      
      const accountsFilter = {
        account: [pubkey.toBase58()],
        owner: [],
        filters: []
      };

      this.subscriptionCounter++;
      const subscriptionId = `account-${this.subscriptionCounter}`;
      
      const accounts = {};
      accounts[subscriptionId] = accountsFilter;
      
      this.stream = await this.client.subscribeOnce(
        accounts,
        {},
        {},
        {},
        {},
        {},
        commitmentLevel,
        []
      );
      
      this._setupStreamHandlers();
      
      console.log(`gRPC subscribed to account: ${accountPublicKey}`);
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
      const commitmentLevel = this._getCommitmentLevel(commitment);
      
      const slotsFilter = {
        filterByCommitment: true
      };

      this.subscriptionCounter++;
      const subscriptionId = `slots-${this.subscriptionCounter}`;
      
      const slots = {};
      slots[subscriptionId] = slotsFilter;
      
      this.stream = await this.client.subscribeOnce(
        {},
        slots,
        {},
        {},
        {},
        {},
        commitmentLevel,
        []
      );
      
      this._setupStreamHandlers();
      
      console.log('gRPC subscribed to slot updates');
      return true;
    } catch (error) {
      console.error('gRPC slot subscription error:', error.message);
      if (this.errorHandler) {
        this.errorHandler(error);
      }
      return false;
    }
  }

  _setupStreamHandlers() {
    if (!this.stream) return;
    
    this.stream.on('data', (update) => {
      this._handleUpdate(update);
    });
    
    this.stream.on('error', (error) => {
      console.error('gRPC stream error:', error.message);
      if (this.errorHandler) {
        this.errorHandler(error);
      }
    });
    
    this.stream.on('end', () => {
      console.log('gRPC stream ended');
    });
  }

  _handleUpdate(update) {
    if (!this.messageHandler) return;
    
    if (update.account) {
      this.messageHandler({
        type: 'account',
        data: update.account,
        slot: update.account.slot ? update.account.slot.toString() : null,
        timestamp: Date.now()
      });
    }
    
    if (update.slot) {
      this.messageHandler({
        type: 'slot',
        slot: update.slot.slot ? update.slot.slot.toString() : null,
        timestamp: Date.now()
      });
    }
    
    if (update.transaction) {
      this.messageHandler({
        type: 'transaction',
        data: update.transaction,
        slot: update.transaction.slot ? update.transaction.slot.toString() : null,
        timestamp: Date.now()
      });
    }
    
    if (update.block) {
      this.messageHandler({
        type: 'block',
        data: update.block,
        slot: update.block.slot ? update.block.slot.toString() : null,
        timestamp: Date.now()
      });
    }
    
    if (update.blockMeta) {
      this.messageHandler({
        type: 'blockMeta',
        data: update.blockMeta,
        slot: update.blockMeta.slot ? update.blockMeta.slot.toString() : null,
        timestamp: Date.now()
      });
    }
  }

  _getCommitmentLevel(commitment) {
    switch (commitment.toLowerCase()) {
      case 'processed':
        return CommitmentLevel.PROCESSED;
      case 'confirmed':
        return CommitmentLevel.CONFIRMED;
      case 'finalized':
        return CommitmentLevel.FINALIZED;
      default:
        return CommitmentLevel.CONFIRMED;
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
      if (this.stream) {
        this.stream.destroy();
        this.stream = null;
      }
      
      this.isConnected = false;
      console.log('gRPC disconnected');
    } catch (error) {
      console.error('gRPC disconnect error:', error.message);
    }
  }
}

module.exports = GrpcClient;
