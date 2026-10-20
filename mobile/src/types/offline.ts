export type OperationKind = 'ORDER' | 'VISIT_CHECK_IN' | 'VISIT_CHECK_OUT' | 'INVENTORY' | 'PRODUCTION';

export type PendingOperation = {
  operationId: string;
  userId: string;
  kind: OperationKind;
  method: 'POST' | 'PATCH';
  path: string;
  payload: unknown;
  occurredAt: string;
  attemptCount: number;
  nextAttemptAt: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  error?: string;
};
