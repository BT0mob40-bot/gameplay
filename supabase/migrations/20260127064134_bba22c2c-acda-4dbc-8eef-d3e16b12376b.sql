-- Add RLS policy allowing users to update their own wallet balance
CREATE POLICY "Users can update own wallet"
ON public.wallets
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);