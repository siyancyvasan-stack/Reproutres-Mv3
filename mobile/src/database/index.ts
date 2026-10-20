import * as SQLite from 'expo-sqlite';
import { PendingOperation } from '../types/offline';

const db = SQLite.openDatabaseSync('tracksale.db');

export function initializeDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cache_entries (
      cache_key TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pending_operations (
      operation_id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, kind TEXT NOT NULL,
      method TEXT NOT NULL, path TEXT NOT NULL, payload TEXT NOT NULL, occurred_at TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, status TEXT NOT NULL, error TEXT
    );
    CREATE INDEX IF NOT EXISTS pending_operations_user_status ON pending_operations(user_id, status, next_attempt_at);
    CREATE TABLE IF NOT EXISTS gps_outbox (
      client_point_id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, payload TEXT NOT NULL,
      captured_at TEXT NOT NULL, attempt_count INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL, last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS gps_outbox_user_due ON gps_outbox(user_id, next_attempt_at, captured_at);
  `);
}

export type QueuedGpsPoint = {
  clientPointId: string;
  userId: string;
  payload: Record<string, unknown>;
  capturedAt: string;
  attemptCount: number;
  nextAttemptAt: string;
  lastError?: string;
};

export function queueGpsPoint(point: QueuedGpsPoint) {
  db.runSync(`INSERT OR IGNORE INTO gps_outbox(client_point_id,user_id,payload,captured_at,attempt_count,next_attempt_at,last_error)
    VALUES(?,?,?,?,?,?,?)`, point.clientPointId, point.userId, JSON.stringify(point.payload), point.capturedAt, point.attemptCount, point.nextAttemptAt, point.lastError ?? null);
}

export function dueGpsPoints(userId: string, limit = 100) {
  const rows = db.getAllSync<Record<string, string | number | null>>(
    'SELECT * FROM gps_outbox WHERE user_id=? AND next_attempt_at<=? ORDER BY captured_at LIMIT ?', userId, new Date().toISOString(), limit,
  );
  return rows.map(row => ({
    clientPointId: String(row.client_point_id), userId: String(row.user_id),
    payload: JSON.parse(String(row.payload)) as Record<string, unknown>, capturedAt: String(row.captured_at),
    attemptCount: Number(row.attempt_count), nextAttemptAt: String(row.next_attempt_at), lastError: row.last_error ? String(row.last_error) : undefined,
  })) as QueuedGpsPoint[];
}

export const removeGpsPoints = (ids: string[]) => {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  db.runSync(`DELETE FROM gps_outbox WHERE client_point_id IN (${placeholders})`, ...ids);
};

export const retryGpsPoint = (point: QueuedGpsPoint, error: string) => {
  const attemptCount = point.attemptCount + 1;
  const delay = Math.min(300_000, 1_000 * 2 ** Math.min(attemptCount, 8)) + Math.floor(Math.random() * 1_000);
  db.runSync('UPDATE gps_outbox SET attempt_count=?,next_attempt_at=?,last_error=? WHERE client_point_id=?',
    attemptCount, new Date(Date.now() + delay).toISOString(), error, point.clientPointId);
};

export const gpsOutboxCount = (userId: string) => db.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM gps_outbox WHERE user_id=?', userId)?.count ?? 0;

export function cacheData(userId: string, key: string, payload: unknown) {
  db.runSync('INSERT OR REPLACE INTO cache_entries(cache_key,user_id,payload,updated_at) VALUES(?,?,?,?)', key, userId, JSON.stringify(payload), new Date().toISOString());
}

export function readCache<T>(userId: string, key: string): T | undefined {
  const row = db.getFirstSync<{ payload: string }>('SELECT payload FROM cache_entries WHERE cache_key=? AND user_id=?', key, userId);
  return row ? JSON.parse(row.payload) as T : undefined;
}

export function queueOperation(operation: PendingOperation) {
  db.runSync(`INSERT OR REPLACE INTO pending_operations(operation_id,user_id,kind,method,path,payload,occurred_at,attempt_count,next_attempt_at,status,error)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`, operation.operationId, operation.userId, operation.kind, operation.method, operation.path, JSON.stringify(operation.payload), operation.occurredAt, operation.attemptCount, operation.nextAttemptAt, operation.status, operation.error ?? null);
}

export function pendingOperations(userId: string) {
  const rows = db.getAllSync<Record<string, string | number | null>>('SELECT * FROM pending_operations WHERE user_id=? ORDER BY occurred_at', userId);
  return rows.map(row => ({ operationId: row.operation_id, userId: row.user_id, kind: row.kind, method: row.method, path: row.path, payload: JSON.parse(String(row.payload)), occurredAt: row.occurred_at, attemptCount: row.attempt_count, nextAttemptAt: row.next_attempt_at, status: row.status, error: row.error ?? undefined })) as PendingOperation[];
}

export const removeOperation = (id: string) => db.runSync('DELETE FROM pending_operations WHERE operation_id=?', id);
export const updateOperation = (op: PendingOperation) => queueOperation(op);
export function clearUserData(userId: string) {
  db.runSync('DELETE FROM cache_entries WHERE user_id=?', userId);
  db.runSync('DELETE FROM pending_operations WHERE user_id=?', userId);
  db.runSync('DELETE FROM gps_outbox WHERE user_id=?', userId);
}
