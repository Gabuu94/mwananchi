-- Fix: Remove UPDATE policy from user_savings that allows users to change their balance
-- This is a critical security fix - balance should only be updated by system triggers

-- Drop existing policies on user_savings
DROP POLICY IF EXISTS "Users can update their own savings" ON public.user_savings;
DROP POLICY IF EXISTS "Users can view their own savings" ON public.user_savings;
DROP POLICY IF EXISTS "Users can insert their own savings" ON public.user_savings;

-- Recreate SELECT policy (users can view their own savings)
CREATE POLICY "Users can view their own savings"
ON public.user_savings
FOR SELECT
USING (auth.uid() = user_id);

-- Recreate INSERT policy (users can create their initial savings record)
CREATE POLICY "Users can insert their own savings"
ON public.user_savings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- NO UPDATE POLICY FOR USERS - balance updates only via triggers/service role

-- Create secure UPDATE policy that only allows service role (for system operations)
-- This ensures only backend operations can modify balances
CREATE POLICY "Only service role can update savings"
ON public.user_savings
FOR UPDATE
USING (false)
WITH CHECK (false);