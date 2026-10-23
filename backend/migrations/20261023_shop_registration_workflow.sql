-- Shop registration workflow: salesperson submission and manager approval.
-- Additive migration; existing shops and data are preserved.

ALTER TABLE Shop
  ADD COLUMN IF NOT EXISTS submittedAt DATETIME NULL,
  ADD COLUMN IF NOT EXISTS reviewedAt DATETIME NULL,
  ADD COLUMN IF NOT EXISTS reviewedById VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS reviewReason VARCHAR(1000) NULL,
  ADD COLUMN IF NOT EXISTS retailerCode VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS brVerificationStatus VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS updatedAt DATETIME NULL;

-- These indexes support manager pending approvals and salesperson shop lists.
-- If your MySQL version does not support CREATE INDEX IF NOT EXISTS, run the
-- equivalent statements only when the named indexes do not already exist.
CREATE INDEX IF NOT EXISTS idx_shop_tenant_status_created
  ON Shop (tenantId, status, createdAt);

CREATE INDEX IF NOT EXISTS idx_shop_tenant_salesperson
  ON Shop (tenantId, assignedSalespersonId);
