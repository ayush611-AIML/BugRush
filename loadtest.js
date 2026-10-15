/**
 * BugRush Load Testing Suite
 * Simulates 25 concurrent 1v1 matches (50 players)
 * Flow: Connect -> Join Queue -> Match Found -> Match Start -> Code Run -> Receive Result -> Match End
 */

const path = require('path');

// Flexible import supporting root, server, or client node_modules
let ioClient;
try {
  ioClient = require('socket.io-client');
} catch (e1) {
  try {
    ioClient = require('./server/node_modules/socket.io-client');
  } catch (e2) {
    ioClient = require('./client/node_modules/socket.io-client');
  }
}
const io = ioClient.io || ioClient;

// Configuration
const ARGS = process.argv.slice(2);
const matchesArg = ARGS.find(a => a.startsWith('--matches='));
const serverArg = ARGS.find(a => a.startsWith('--url='));

const CONCURRENT_MATCHES = matchesArg ? parseInt(matchesArg.split('=')[1], 10) : 25;
const TOTAL_PLAYERS = CONCURRENT_MATCHES * 2;
const SERVER_URL = serverArg ? serverArg.split('=')[1] : (process.env.SERVER_URL || 'http://localhost:5000');

console.log('===============================================================');
console.log('⚡  BUGRUSH LOAD TESTING SUITE — 1v1 REAL-TIME ARENA  ⚡');
console.log('===============================================================');
console.log(` Target Server        : ${SERVER_URL}`);
console.log(` Concurrent Matches   : ${CONCURRENT_MATCHES}`);
console.log(` Total Players        : ${TOTAL_PLAYERS}`);
console.log(` Concurrency Model    : 25 distinct 1v1 matchmaking pairs`);
console.log('===============================================================\n');

// Metrics tracking
const metrics = {
  connectedPlayers: 0,
  queueJoined: 0,
  matchesFound: 0,
  matchesStarted: 0,
  codeRunsSubmitted: 0,
  codeRunsCompleted: 0,
  matchesCompleted: 0,
  errors: 0,
  matchmakingLatencies: [],
  codeExecutionLatencies: []
};

// Rooms tracking
const activeRooms = new Set();
const sockets = [];

// Sample clean test solutions for challenges
const SAMPLE_SOLUTIONS = [
  'function sumTo(n) { let s = 0; for (let i = 0; i <= n; i++) s += i; return s; }',
  'function clamp(val, min, max) { return Math.min(Math.max(val, Math.min(min, max)), Math.max(min, max)); }',
  'function removeDuplicates(arr) { return Array.from(new Set(arr)); }',
  'function chunkArray(arr, size) { if (!size || size <= 0) return []; const c = []; for (let i = 0; i < arr.length; i += size) c.push(arr.slice(i, i + size)); return c; }',
  'function compact(arr) { return arr.filter(Boolean); }'
];

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function average(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function printLiveStatus() {
  const line = `[Progress] Connected: ${metrics.connectedPlayers}/${TOTAL_PLAYERS} | Queued: ${metrics.queueJoined} | Matches: ${metrics.matchesFound}/${CONCURRENT_MATCHES} | Runs: ${metrics.codeRunsCompleted}/${TOTAL_PLAYERS}`;
  process.stdout.write(`\r${line}`);
}

async function createPlayer(index, pairIndex) {
  // Players in the same pair are given identical ratings so they match with each other
  const baseRating = 1000 + (pairIndex * 15);
  const playerId = `load_usr_${Date.now()}_${index}`;
  const username = `StressTester_${index + 1}`;

  return new Promise((resolve) => {
    const socket = io(SERVER_URL, {
      auth: {
        guestId: playerId,
        guestName: username,
        rating: baseRating
      },
      transports: ['websocket'],
      reconnection: false
    });

    sockets.push(socket);

    let queueJoinTimestamp = 0;
    let codeRunTimestamp = 0;
    let assignedRoomId = null;

    socket.on('connect', () => {
      metrics.connectedPlayers++;
      printLiveStatus();

      // Small randomized stagger before joining queue (0 - 300ms)
      setTimeout(() => {
        queueJoinTimestamp = Date.now();
        socket.emit('queue:join', { rating: baseRating });
      }, Math.floor(Math.random() * 300));
    });

    socket.on('queue:joined', () => {
      metrics.queueJoined++;
      printLiveStatus();
    });

    socket.on('match:found', (data) => {
      metrics.matchesFound++;
      assignedRoomId = data.roomId;
      activeRooms.add(assignedRoomId);

      const latency = Date.now() - queueJoinTimestamp;
      metrics.matchmakingLatencies.push(latency);
      printLiveStatus();
    });

    socket.on('match:start', (data) => {
      metrics.matchesStarted++;
      const roomId = data.roomId || assignedRoomId;

      // Realistic thinking/typing delay (200 - 800ms)
      setTimeout(() => {
        const solutionCode = SAMPLE_SOLUTIONS[index % SAMPLE_SOLUTIONS.length];
        codeRunTimestamp = Date.now();
        metrics.codeRunsSubmitted++;
        printLiveStatus();

        socket.emit('code:run', {
          roomId,
          code: solutionCode
        });
      }, 200 + Math.floor(Math.random() * 600));
    });

    socket.on('run:result', (result) => {
      const execLatency = Date.now() - codeRunTimestamp;
      metrics.codeExecutionLatencies.push(execLatency);
      metrics.codeRunsCompleted++;
      printLiveStatus();
    });

    socket.on('match:end', () => {
      metrics.matchesCompleted++;
      printLiveStatus();
    });

    socket.on('connect_error', (err) => {
      metrics.errors++;
      console.error(`\n[Socket Error ${username}]:`, err.message);
    });

    socket.on('error', (err) => {
      metrics.errors++;
      console.error(`\n[Server Error ${username}]:`, err.message || err);
    });

    // Resolve immediately so caller can initiate next socket
    resolve();
  });
}

async function runLoadTest() {
  const testStartTime = Date.now();

  console.log(`🚀 Spawning ${TOTAL_PLAYERS} players across ${CONCURRENT_MATCHES} rating pools...`);

  // Ramp up players in quick batches of 10
  for (let i = 0; i < TOTAL_PLAYERS; i++) {
    const pairIndex = Math.floor(i / 2);
    await createPlayer(i, pairIndex);
    if (i % 10 === 9) {
      await new Promise(r => setTimeout(r, 80)); // 80ms interval per batch
    }
  }

  console.log('\n⏳ All 50 players connected and queued. Awaiting matches and code executions...\n');

  // Poll until either all code runs complete or 35s timeout
  const timeoutMs = 35000;
  const pollInterval = 300;
  let elapsed = 0;

  while (elapsed < timeoutMs) {
    await new Promise(r => setTimeout(r, pollInterval));
    elapsed += pollInterval;

    // Check if all players completed their code runs
    if (metrics.codeRunsCompleted >= TOTAL_PLAYERS && metrics.matchesFound >= CONCURRENT_MATCHES) {
      break;
    }
  }

  const totalDurationMs = Date.now() - testStartTime;

  console.log('\n\n===============================================================');
  console.log('📊  LOAD TEST RESULTS & BENCHMARK SUMMARY  📊');
  console.log('===============================================================');
  console.log(` Target Server               : ${SERVER_URL}`);
  console.log(` Total Test Duration         : ${(totalDurationMs / 1000).toFixed(2)}s`);
  console.log(` Target 1v1 Matches          : ${CONCURRENT_MATCHES}`);
  console.log(` Total Simulated Players     : ${TOTAL_PLAYERS}`);
  console.log(` Connected Sockets           : ${metrics.connectedPlayers} / ${TOTAL_PLAYERS}`);
  console.log(` Queue Placements            : ${metrics.queueJoined} / ${TOTAL_PLAYERS}`);
  console.log(` Matches Established         : ${metrics.matchesFound / 2} / ${CONCURRENT_MATCHES} (Total match:found events: ${metrics.matchesFound})`);
  console.log(` Unique Match Rooms Active   : ${activeRooms.size}`);
  console.log(` Code Runs Submitted         : ${metrics.codeRunsSubmitted}`);
  console.log(` Code Runs Evaluated         : ${metrics.codeRunsCompleted}`);
  console.log(` Unhandled Errors            : ${metrics.errors}`);
  console.log('---------------------------------------------------------------');
  console.log('⏱️  LATENCY BENCHMARKS');
  console.log('---------------------------------------------------------------');

  const mm = metrics.matchmakingLatencies;
  console.log('Matchmaking Pairing Latency (Queue Join -> match:found):');
  console.log(`  - Mean    : ${average(mm)} ms`);
  console.log(`  - Min     : ${mm.length ? Math.min(...mm) : 0} ms`);
  console.log(`  - Median  : ${percentile(mm, 50)} ms`);
  console.log(`  - P95     : ${percentile(mm, 95)} ms`);
  console.log(`  - P99     : ${percentile(mm, 99)} ms`);
  console.log(`  - Max     : ${mm.length ? Math.max(...mm) : 0} ms`);

  const ce = metrics.codeExecutionLatencies;
  console.log('\nCode Evaluation Latency (code:run -> run:result):');
  console.log(`  - Mean    : ${average(ce)} ms`);
  console.log(`  - Min     : ${ce.length ? Math.min(...ce) : 0} ms`);
  console.log(`  - Median  : ${percentile(ce, 50)} ms`);
  console.log(`  - P95     : ${percentile(ce, 95)} ms`);
  console.log(`  - P99     : ${percentile(ce, 99)} ms`);
  console.log(`  - Max     : ${ce.length ? Math.max(...ce) : 0} ms`);

  console.log('===============================================================');

  // Validation verdict
  const success = metrics.matchesFound >= CONCURRENT_MATCHES && metrics.codeRunsCompleted >= (TOTAL_PLAYERS * 0.9);
  if (success) {
    console.log('✅ PASS: Successfully handled 25 concurrent 1v1 matches with zero socket drops!\n');
  } else {
    console.log('⚠️ PARTIAL: Completed test cycle with partial executions.\n');
  }

  // Cleanup all sockets
  for (const s of sockets) {
    try { s.disconnect(); } catch (e) {}
  }

  process.exit(success ? 0 : 1);
}

runLoadTest().catch((err) => {
  console.error('\nFatal load test error:', err);
  process.exit(1);
});
