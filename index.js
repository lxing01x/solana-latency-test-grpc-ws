const config = require('./config');
const GrpcClient = require('./grpcClient');
const WsClient = require('./wsClient');
const TestFramework = require('./testFramework');

const grpcClient = new GrpcClient();
const wsClient = new WsClient();
const testFramework = new TestFramework(config.test.durationSeconds);

let testTimer = null;

async function main() {
  console.log('='.repeat(80));
  console.log('SOLANA LATENCY TEST - gRPC vs WebSocket');
  console.log('='.repeat(80));
  console.log(`\n配置信息:`);
  console.log(`  gRPC 端点: ${config.grpc.endpoint}`);
  console.log(`  WebSocket 端点: ${config.websocket.endpoint}`);
  console.log(`  测试时长: ${config.test.durationSeconds} 秒`);
  console.log(`  监听账户: ${config.test.accountToWatch}`);
  console.log(`  确认级别: ${config.test.commitment}`);
  console.log('='.repeat(80) + '\n');

  grpcClient.onMessage((message) => {
    testFramework.recordGrpcMessage(message);
    console.log(`[gRPC] Received ${message.type} update at slot ${message.slot}`);
  });

  grpcClient.onError((error) => {
    testFramework.recordGrpcError(error);
  });

  wsClient.onMessage((message) => {
    testFramework.recordWsMessage(message);
    console.log(`[WebSocket] Received ${message.type} update at slot ${message.slot}`);
  });

  wsClient.onError((error) => {
    testFramework.recordWsError(error);
  });

  console.log('\n正在连接客户端...\n');

  const grpcConnected = await grpcClient.connect();
  const wsConnected = await wsClient.connect();

  if (!grpcConnected && !wsConnected) {
    console.error('无法连接任何客户端，测试终止');
    process.exit(1);
  }

  console.log('\n正在订阅消息...\n');

  if (grpcConnected) {
    await grpcClient.subscribeToSlots(config.test.commitment);
  }

  if (wsConnected) {
    await wsClient.subscribeToSlots();
  }

  console.log('\n' + '='.repeat(80));
  console.log('测试开始！');
  console.log('='.repeat(80) + '\n');

  testFramework.start();

  testTimer = setTimeout(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('测试时间结束，正在停止...');
    console.log('='.repeat(80));

    testFramework.stop();

    if (grpcConnected) {
      await grpcClient.disconnect();
    }

    if (wsConnected) {
      await wsClient.disconnect();
    }

    testFramework.printResults();

    process.exit(0);
  }, config.test.durationSeconds * 1000);
}

process.on('SIGINT', async () => {
  console.log('\n\n收到中断信号，正在停止测试...');

  if (testTimer) {
    clearTimeout(testTimer);
  }

  testFramework.stop();

  try {
    await grpcClient.disconnect();
  } catch (e) {}

  try {
    await wsClient.disconnect();
  } catch (e) {}

  testFramework.printResults();

  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error.message);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

main().catch((error) => {
  console.error('主程序错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});
