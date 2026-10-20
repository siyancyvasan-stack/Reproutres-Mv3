import { ApiError, apiRequest } from './api';
import { pendingOperations, removeOperation, updateOperation } from '../database';
import { OperationKind, PendingOperation } from '../types/offline';

const uuid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;

export function createOperation(userId: string, kind: OperationKind, method: 'POST' | 'PATCH', path: string, payload: unknown): PendingOperation {
  const now = new Date().toISOString();
  return { operationId: uuid(), userId, kind, method, path, payload, occurredAt: now, attemptCount: 0, nextAttemptAt: now, status: 'PENDING' };
}

export async function syncPending(userId: string) {
  const due = pendingOperations(userId).filter(op => op.status !== 'FAILED' && op.nextAttemptAt <= new Date().toISOString());
  for (const operation of due) {
    try {
      await apiRequest(operation.path, {
        method: operation.method,
        headers: { 'X-Idempotency-Key': operation.operationId },
        body: JSON.stringify(operation.payload),
      });
      removeOperation(operation.operationId);
    } catch (error) {
      const permanent = error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 409 && error.status !== 429;
      const attemptCount = operation.attemptCount + 1;
      const delay = Math.min(300_000, 1_000 * 2 ** attemptCount) + Math.floor(Math.random() * 1_000);
      updateOperation({ ...operation, attemptCount, status: permanent ? 'FAILED' : 'PENDING', error: error instanceof Error ? error.message : 'Sync failed', nextAttemptAt: new Date(Date.now() + delay).toISOString() });
    }
  }
}
