-- Create secure server-side functions for balance operations
-- These functions run with elevated privileges to update balances safely

-- Function to deduct bet from wallet (returns true if successful)
CREATE OR REPLACE FUNCTION public.deduct_bet(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- Get current balance with row lock
  SELECT balance INTO v_current_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check sufficient balance
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct balance
  UPDATE wallets
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- Function to add winnings to wallet
CREATE OR REPLACE FUNCTION public.add_winnings(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE wallets
  SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.deduct_bet TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_winnings TO authenticated;