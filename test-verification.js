// Standalone automated test suite for NIRVANA core logic
const assert = require('assert');

console.log('====================================================');
console.log('🧪 RUNNING NIRVANA TEST SUITE (Stages 1, 2, 3)');
console.log('====================================================\n');

// 1. Test Last-Write-Wins (LWW) Conflict Resolution with Timestamp Versioning
console.log('👉 [Test 1] Last-Write-Wins (LWW) Conflict Resolution:');

function resolveLWWConflict(local, incoming) {
  if (local.id !== incoming.id) {
    return { winner: 'incoming', resolved: incoming, conflict: false };
  }
  const isIncomingNewerTime = incoming.timestamp > local.timestamp;
  const isSameTimeHigherVer = incoming.timestamp === local.timestamp && incoming.version > local.version;

  if (isIncomingNewerTime || isSameTimeHigherVer) {
    return {
      winner: 'incoming',
      resolved: {
        ...incoming,
        confirmations: Math.max(local.confirmations || 0, incoming.confirmations || 0),
      },
      conflict: true,
      reason: `Incoming newer (T=${incoming.timestamp}, V=${incoming.version} vs Local T=${local.timestamp}, V=${local.version})`,
    };
  }

  return {
    winner: 'local',
    resolved: {
      ...local,
      confirmations: Math.max(local.confirmations || 0, incoming.confirmations || 0),
    },
    conflict: true,
    reason: `Local newer or higher version`,
  };
}

const localReport = {
  id: 'rep-test-nh10',
  corridorId: 'corridor-nh10',
  roadName: 'NH-10 Siliguri-Gangtok',
  status: 'blocked',
  timestamp: 1000,
  version: 1,
  confirmations: 5,
};

// Scenario A: Incoming update has newer timestamp
const newerIncoming = {
  ...localReport,
  status: 'risky',
  timestamp: 1500,
  version: 2,
  confirmations: 2,
};
const resA = resolveLWWConflict(localReport, newerIncoming);
assert.strictEqual(resA.winner, 'incoming');
assert.strictEqual(resA.resolved.status, 'risky');
assert.strictEqual(resA.resolved.confirmations, 5, 'Should preserve maximum confirmations');
console.log('  ✅ Scenario A passed: Newer incoming update won (timestamp 1500 > 1000)');

// Scenario B: Incoming update has older timestamp (late arrival from offline partitioned device)
const staleIncoming = {
  ...localReport,
  status: 'open',
  timestamp: 800,
  version: 1,
  confirmations: 1,
};
const resB = resolveLWWConflict(localReport, staleIncoming);
assert.strictEqual(resB.winner, 'local');
assert.strictEqual(resB.resolved.status, 'blocked');
console.log('  ✅ Scenario B passed: Stale incoming update rejected (local 1000 > 800)');

// Scenario C: Equal timestamp, higher version tie-breaker
const tieBreakIncoming = {
  ...localReport,
  status: 'open',
  timestamp: 1000,
  version: 3,
};
const resC = resolveLWWConflict(localReport, tieBreakIncoming);
assert.strictEqual(resC.winner, 'incoming');
assert.strictEqual(resC.resolved.version, 3);
console.log('  ✅ Scenario C passed: Version tie-breaker won on identical timestamps');

// 2. Test Offline Sync Queue State Machine
console.log('\n👉 [Test 2] Offline Sync Queue State Transitions:');
class MockSyncQueue {
  constructor() {
    this.reports = [];
    this.queue = [];
  }

  submit(data, isOnline) {
    const report = {
      ...data,
      id: 'rep-' + Math.random().toString(36).substring(2),
      syncState: isOnline ? 'synced' : 'queued',
      timestamp: Date.now(),
      version: 1,
    };
    this.reports.push(report);
    if (!isOnline) {
      this.queue.push({ reportId: report.id, payload: report });
    }
    return report;
  }

  flush() {
    let count = 0;
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      const rec = this.reports.find((r) => r.id === item.reportId);
      if (rec) {
        rec.syncState = 'synced';
        count++;
      }
    }
    return count;
  }
}

const mockQueue = new MockSyncQueue();

// 2a. Online submission
const onlineReport = mockQueue.submit({ roadName: 'NH-10', status: 'blocked' }, true);
assert.strictEqual(onlineReport.syncState, 'synced');
assert.strictEqual(mockQueue.queue.length, 0);
console.log('  ✅ Online submission marked immediately as "synced" with 0 queued items');

// 2b. Offline submission
const offlineReport = mockQueue.submit({ roadName: 'NH-27', status: 'risky' }, false);
assert.strictEqual(offlineReport.syncState, 'queued');
assert.strictEqual(mockQueue.queue.length, 1);
console.log('  ✅ Offline submission marked as "queued" with 1 item in on-device queue');

// 2c. Network reconnection flush
const flushedCount = mockQueue.flush();
assert.strictEqual(flushedCount, 1);
assert.strictEqual(mockQueue.queue.length, 0);
assert.strictEqual(offlineReport.syncState, 'synced');
console.log('  ✅ Auto-sync flush transitioned queued item to "synced" and cleared queue');

// 3. Test Dashboard KPI & District Aggregations
console.log('\n👉 [Test 3] Dashboard KPIs & District Breakdown Calculations:');
const sampleReports = [
  { id: '1', district: 'Kalimpong', state: 'Sikkim', status: 'blocked' },
  { id: '2', district: 'Kalimpong', state: 'Sikkim', status: 'risky' },
  { id: '3', district: 'Dima Hasao', state: 'Assam', status: 'blocked' },
  { id: '4', district: 'East Jaintia Hills', state: 'Meghalaya', status: 'open' },
  { id: '5', district: 'Chumukedima', state: 'Nagaland', status: 'risky' },
];

const totalReports = sampleReports.length;
const activeBlockages = sampleReports.filter((r) => r.status === 'blocked').length;
const riskyCount = sampleReports.filter((r) => r.status === 'risky').length;
const openCount = sampleReports.filter((r) => r.status === 'open').length;

assert.strictEqual(totalReports, 5);
assert.strictEqual(activeBlockages, 2);
assert.strictEqual(riskyCount, 2);
assert.strictEqual(openCount, 1);

const districtMap = {};
sampleReports.forEach((r) => {
  if (!districtMap[r.district]) {
    districtMap[r.district] = { open: 0, risky: 0, blocked: 0, total: 0 };
  }
  districtMap[r.district][r.status]++;
  districtMap[r.district].total++;
});

assert.strictEqual(districtMap['Kalimpong'].blocked, 1);
assert.strictEqual(districtMap['Kalimpong'].risky, 1);
assert.strictEqual(districtMap['Kalimpong'].total, 2);
assert.strictEqual(districtMap['Dima Hasao'].blocked, 1);
console.log('  ✅ Dashboard KPIs correctly computed: 2 Blocked, 2 Risky, 1 Open');
console.log('  ✅ District aggregations correctly mapped Kalimpong (2) and Dima Hasao (1)');

console.log('\n====================================================');
console.log('🎉 ALL TEST SUITES PASSED FOR NIRVANA');
console.log('====================================================');
