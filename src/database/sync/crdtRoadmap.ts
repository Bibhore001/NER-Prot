/**
 * NIRVANA Synchronization Architecture & CRDT Upgrade Roadmap
 * ==========================================================
 *
 * Current Implementation:
 * -----------------------
 * Last-Write-Wins (LWW) with Hybrid Timestamp Versioning:
 * - Each RoadReport carries:
 *     1. `timestamp`: Epoch milliseconds when recorded on-device.
 *     2. `version`: Monotonically increasing sequence number per record.
 * - Conflict rule:
 *     `incoming.timestamp > local.timestamp || (incoming.timestamp === local.timestamp && incoming.version > local.version)`
 *
 * Why Hill Regions in Northeast India Demand Eventual CRDT Migration:
 * -------------------------------------------------------------------
 * In mountain highways like NH-10 (Sikkim) and NH-27 (Dima Hasao), heavy monsoon
 * rains routinely knock down telecom base stations for 12-48 hours. Multiple convoy drivers
 * or residents make concurrent reports at different points along the same corridor without
 * centralized connectivity:
 *   - Driver A (offline at 29th Mile): Marks road BLOCKED at 14:00 (clock drift: 13:58)
 *   - BRO Official B (offline at Sevoke): Clears road to RISKY at 14:05 (clock drift: 14:02)
 *   - Under naive LWW, clock skew or late syncs could erroneously overwrite the newer clearance
 *     with an older blockage report.
 *
 * Proposed CRDT Upgrade Roadmap:
 * ------------------------------
 * 1. Road Status State CRDT: LWW-Element-Set (Add-Wins / Remove-Wins)
 *    - Model road open/blocked states as an add-set (reported hazards) and remove-set (cleared hazards)
 *    - Clearance operations produce causal tombstones with Lamport timestamps rather than wall-clock.
 *
 * 2. Crowdsourced Confirmations: PN-Counter (Positive-Negative Counter)
 *    - Each user node maintains an increment/decrement state vector:
 *      P = [nodeA: 3, nodeB: 1], N = [nodeA: 0, nodeB: 1]
 *    - Allows offline users to upvote or refute road status without overwriting others' votes.
 *
 * 3. Corridor Notes & Incident Logs: JSON CRDT (Automerge / Yjs)
 *    - Multi-responder situational logs (e.g. BRO excavator dispatch notes + police traffic diversions)
 *      merge commutatively without merge conflicts.
 */

import { RoadReportData } from '../../types';

export interface LWWConflictResolutionResult {
  winner: 'incoming' | 'local' | 'merged';
  resolvedReport: RoadReportData;
  conflictDetected: boolean;
  reason: string;
}

/**
 * Resolves conflict between an incoming synced report and existing local record
 * using Last-Write-Wins with version tie-breaking.
 * [CRDT-FLAG]: Replace this function with State-based CRDT / Delta-state merge in Phase 2.
 */
export function resolveLWWConflict(
  local: RoadReportData,
  incoming: RoadReportData
): LWWConflictResolutionResult {
  // If IDs differ, there is no direct collision
  if (local.id !== incoming.id) {
    return {
      winner: 'incoming',
      resolvedReport: incoming,
      conflictDetected: false,
      reason: 'Distinct report IDs',
    };
  }

  // Conflict scenario: Both devices updated the same report
  const isIncomingNewerTimestamp = incoming.timestamp > local.timestamp;
  const isSameTimestampHigherVersion = 
    incoming.timestamp === local.timestamp && incoming.version > local.version;

  if (isIncomingNewerTimestamp || isSameTimestampHigherVersion) {
    return {
      winner: 'incoming',
      // Preserve local confirmations if incoming had fewer due to offline partitioning
      resolvedReport: {
        ...incoming,
        confirmations: Math.max(local.confirmations, incoming.confirmations),
      },
      conflictDetected: true,
      reason: `Incoming record is newer (Incoming: T=${incoming.timestamp}, V=${incoming.version} vs Local: T=${local.timestamp}, V=${local.version})`,
    };
  }

  return {
    winner: 'local',
    resolvedReport: {
      ...local,
      confirmations: Math.max(local.confirmations, incoming.confirmations),
    },
    conflictDetected: true,
    reason: `Local record is newer or higher version (Local: T=${local.timestamp}, V=${local.version} vs Incoming: T=${incoming.timestamp}, V=${incoming.version})`,
  };
}
