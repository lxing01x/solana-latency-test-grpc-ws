module.exports = {
  grpc: {
    endpoint: process.env.GRPC_ENDPOINT || "grpc.mainnet-beta.solana.com:443",
    token: process.env.GRPC_TOKEN || "",
  },
  
  websocket: {
    endpoint: process.env.WS_ENDPOINT || "wss://api.mainnet-beta.solana.com/",
  },
  
  test: {
    durationSeconds: parseInt(process.env.TEST_DURATION, 10) || 30,
    accountToWatch: process.env.ACCOUNT_TO_WATCH || "9vpsmXhZYMpvhCKiVoX5U8b1iKpfwJed2dKQ12L32y",
    commitment: "confirmed",
    encoding: "base64",
  },
};
