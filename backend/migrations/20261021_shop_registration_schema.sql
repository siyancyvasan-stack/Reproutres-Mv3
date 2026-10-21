-- Shop registration schema migration.
-- Safe to run repeatedly; existing shop records and columns are preserved.

ALTER TABLE Shop
  ADD COLUMN IF NOT EXISTS alternateMobile VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS email VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS paymentTerms VARCHAR(120) NULL;
