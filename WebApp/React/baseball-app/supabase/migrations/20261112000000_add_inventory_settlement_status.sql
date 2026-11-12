ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS settlement_status text NOT NULL DEFAULT 'reimbursement'
CHECK (settlement_status IN ('reimbursement', 'settled'));
