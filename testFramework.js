class TestFramework {
  constructor(durationSeconds) {
    this.durationSeconds = durationSeconds;
    this.startTime = null;
    this.endTime = null;
    
    this.grpcMessages = [];
    this.wsMessages = [];
    
    this.grpcStats = {
      totalMessages: 0,
      firstMessageTime: null,
      lastMessageTime: null,
      latencies: [],
      errors: 0
    };
    
    this.wsStats = {
      totalMessages: 0,
      firstMessageTime: null,
      lastMessageTime: null,
      latencies: [],
      errors: 0
    };
  }

  start() {
    this.startTime = Date.now();
    console.log(`Test started at: ${new Date().toISOString()}`);
    console.log(`Test duration: ${this.durationSeconds} seconds`);
  }

  stop() {
    this.endTime = Date.now();
    console.log(`Test stopped at: ${new Date().toISOString()}`);
  }

  recordGrpcMessage(message) {
    const now = Date.now();
    this.grpcMessages.push({
      ...message,
      receivedAt: now
    });
    
    this.grpcStats.totalMessages++;
    if (!this.grpcStats.firstMessageTime) {
      this.grpcStats.firstMessageTime = now;
    }
    this.grpcStats.lastMessageTime = now;
    
    if (this.startTime) {
      this.grpcStats.latencies.push(now - this.startTime);
    }
  }

  recordWsMessage(message) {
    const now = Date.now();
    this.wsMessages.push({
      ...message,
      receivedAt: now
    });
    
    this.wsStats.totalMessages++;
    if (!this.wsStats.firstMessageTime) {
      this.wsStats.firstMessageTime = now;
    }
    this.wsStats.lastMessageTime = now;
    
    if (this.startTime) {
      this.wsStats.latencies.push(now - this.startTime);
    }
  }

  recordGrpcError(error) {
    this.grpcStats.errors++;
    console.error('gRPC Error:', error.message);
  }

  recordWsError(error) {
    this.wsStats.errors++;
    console.error('WebSocket Error:', error.message);
  }

  calculateStats(messages, stats, name) {
    const actualDuration = this.endTime 
      ? (this.endTime - this.startTime) / 1000 
      : this.durationSeconds;
    
    const messageRate = actualDuration > 0 
      ? stats.totalMessages / actualDuration 
      : 0;
    
    let avgLatency = 0;
    let minLatency = 0;
    let maxLatency = 0;
    let medianLatency = 0;
    
    if (stats.latencies.length > 0) {
      avgLatency = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;
      minLatency = Math.min(...stats.latencies);
      maxLatency = Math.max(...stats.latencies);
      
      const sorted = [...stats.latencies].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianLatency = sorted.length % 2 !== 0 
        ? sorted[mid] 
        : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    
    const timeToFirstMessage = stats.firstMessageTime && this.startTime
      ? stats.firstMessageTime - this.startTime
      : null;
    
    const timeToLastMessage = stats.lastMessageTime && this.startTime
      ? stats.lastMessageTime - this.startTime
      : null;
    
    return {
      name,
      totalMessages: stats.totalMessages,
      errors: stats.errors,
      messageRate: messageRate.toFixed(2),
      avgLatencyMs: avgLatency.toFixed(2),
      minLatencyMs: minLatency,
      maxLatencyMs: maxLatency,
      medianLatencyMs: medianLatency.toFixed(2),
      timeToFirstMessageMs: timeToFirstMessage,
      timeToLastMessageMs: timeToLastMessage,
      actualDurationSeconds: actualDuration.toFixed(2)
    };
  }

  calculateAccuracy() {
    const grpcSlots = new Set(this.grpcMessages.map(m => m.slot));
    const wsSlots = new Set(this.wsMessages.map(m => m.slot));
    
    const union = new Set([...grpcSlots, ...wsSlots]);
    const intersection = new Set([...grpcSlots].filter(x => wsSlots.has(x)));
    
    const grpcCoverage = union.size > 0 ? (grpcSlots.size / union.size) * 100 : 0;
    const wsCoverage = union.size > 0 ? (wsSlots.size / union.size) * 100 : 0;
    const overlap = union.size > 0 ? (intersection.size / union.size) * 100 : 0;
    
    return {
      totalUniqueSlots: union.size,
      grpcUniqueSlots: grpcSlots.size,
      wsUniqueSlots: wsSlots.size,
      overlappingSlots: intersection.size,
      grpcCoveragePercent: grpcCoverage.toFixed(2),
      wsCoveragePercent: wsCoverage.toFixed(2),
      overlapPercent: overlap.toFixed(2)
    };
  }

  getResults() {
    const grpcStats = this.calculateStats(this.grpcMessages, this.grpcStats, 'gRPC');
    const wsStats = this.calculateStats(this.wsMessages, this.wsStats, 'WebSocket');
    const accuracy = this.calculateAccuracy();
    
    let winner = 'Draw';
    let reason = '';
    
    const grpcRate = parseFloat(grpcStats.messageRate);
    const wsRate = parseFloat(wsStats.messageRate);
    const grpcLatency = parseFloat(grpcStats.avgLatencyMs);
    const wsLatency = parseFloat(wsStats.avgLatencyMs);
    
    if (grpcRate > 0 && wsRate > 0) {
      const rateDiff = ((grpcRate - wsRate) / wsRate) * 100;
      const latencyDiff = ((wsLatency - grpcLatency) / wsLatency) * 100;
      
      if (grpcRate > wsRate && grpcLatency < wsLatency) {
        winner = 'gRPC';
        reason = `gRPC is ${rateDiff.toFixed(1)}% faster (${grpcRate} vs ${wsRate} msg/s) and ${latencyDiff.toFixed(1)}% lower latency (${grpcStats.avgLatencyMs}ms vs ${wsStats.avgLatencyMs}ms)`;
      } else if (wsRate > grpcRate && wsLatency < grpcLatency) {
        winner = 'WebSocket';
        reason = `WebSocket is ${Math.abs(rateDiff).toFixed(1)}% faster (${wsRate} vs ${grpcRate} msg/s) and ${Math.abs(latencyDiff).toFixed(1)}% lower latency (${wsStats.avgLatencyMs}ms vs ${grpcStats.avgLatencyMs}ms)`;
      } else if (grpcRate > wsRate) {
        winner = 'gRPC';
        reason = `gRPC has ${rateDiff.toFixed(1)}% higher message rate (${grpcRate} vs ${wsRate} msg/s)`;
      } else if (wsRate > grpcRate) {
        winner = 'WebSocket';
        reason = `WebSocket has ${Math.abs(rateDiff).toFixed(1)}% higher message rate (${wsRate} vs ${grpcRate} msg/s)`;
      } else if (grpcLatency < wsLatency) {
        winner = 'gRPC';
        reason = `gRPC has ${latencyDiff.toFixed(1)}% lower latency (${grpcStats.avgLatencyMs}ms vs ${wsStats.avgLatencyMs}ms)`;
      } else if (wsLatency < grpcLatency) {
        winner = 'WebSocket';
        reason = `WebSocket has ${Math.abs(latencyDiff).toFixed(1)}% lower latency (${wsStats.avgLatencyMs}ms vs ${grpcStats.avgLatencyMs}ms)`;
      }
    }
    
    return {
      overall: {
        winner,
        reason,
        testDurationSeconds: this.durationSeconds,
        actualDurationSeconds: this.endTime 
          ? ((this.endTime - this.startTime) / 1000).toFixed(2)
          : this.durationSeconds.toFixed(2),
        startTime: this.startTime ? new Date(this.startTime).toISOString() : null,
        endTime: this.endTime ? new Date(this.endTime).toISOString() : null
      },
      accuracy,
      grpc: grpcStats,
      websocket: wsStats
    };
  }

  printResults() {
    const results = this.getResults();
    
    console.log('\n' + '='.repeat(80));
    console.log('SOLANA LATENCY TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log('\n【整体对比信息】');
    console.log('-'.repeat(60));
    console.log(`测试时长 (配置): ${results.overall.testDurationSeconds} 秒`);
    console.log(`测试时长 (实际): ${results.overall.actualDurationSeconds} 秒`);
    console.log(`开始时间: ${results.overall.startTime}`);
    console.log(`结束时间: ${results.overall.endTime}`);
    console.log(`\n🏆 胜出者: ${results.overall.winner}`);
    console.log(`📊 原因: ${results.overall.reason}`);
    
    console.log('\n【准确率统计】');
    console.log('-'.repeat(60));
    console.log(`总唯一Slot数: ${results.accuracy.totalUniqueSlots}`);
    console.log(`gRPC 唯一Slot数: ${results.accuracy.grpcUniqueSlots} (覆盖率: ${results.accuracy.grpcCoveragePercent}%)`);
    console.log(`WebSocket 唯一Slot数: ${results.accuracy.wsUniqueSlots} (覆盖率: ${results.accuracy.wsCoveragePercent}%)`);
    console.log(`重叠Slot数: ${results.accuracy.overlappingSlots} (重叠率: ${results.accuracy.overlapPercent}%)`);
    
    console.log('\n【gRPC 详细统计】');
    console.log('-'.repeat(60));
    console.log(`总消息数: ${results.grpc.totalMessages}`);
    console.log(`错误数: ${results.grpc.errors}`);
    console.log(`消息速率: ${results.grpc.messageRate} 消息/秒`);
    console.log(`平均延迟: ${results.grpc.avgLatencyMs} ms`);
    console.log(`最小延迟: ${results.grpc.minLatencyMs} ms`);
    console.log(`最大延迟: ${results.grpc.maxLatencyMs} ms`);
    console.log(`中位延迟: ${results.grpc.medianLatencyMs} ms`);
    console.log(`首条消息时间: ${results.grpc.timeToFirstMessageMs} ms`);
    console.log(`末条消息时间: ${results.grpc.timeToLastMessageMs} ms`);
    
    console.log('\n【WebSocket 详细统计】');
    console.log('-'.repeat(60));
    console.log(`总消息数: ${results.websocket.totalMessages}`);
    console.log(`错误数: ${results.websocket.errors}`);
    console.log(`消息速率: ${results.websocket.messageRate} 消息/秒`);
    console.log(`平均延迟: ${results.websocket.avgLatencyMs} ms`);
    console.log(`最小延迟: ${results.websocket.minLatencyMs} ms`);
    console.log(`最大延迟: ${results.websocket.maxLatencyMs} ms`);
    console.log(`中位延迟: ${results.websocket.medianLatencyMs} ms`);
    console.log(`首条消息时间: ${results.websocket.timeToFirstMessageMs} ms`);
    console.log(`末条消息时间: ${results.websocket.timeToLastMessageMs} ms`);
    
    console.log('\n' + '='.repeat(80));
    
    return results;
  }
}

module.exports = TestFramework;
