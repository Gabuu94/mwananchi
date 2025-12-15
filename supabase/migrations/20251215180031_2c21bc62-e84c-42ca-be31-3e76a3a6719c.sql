-- Enable realtime for payment-related tables
ALTER TABLE public.savings_deposits REPLICA IDENTITY FULL;
ALTER TABLE public.loan_disbursements REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.savings_deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_disbursements;