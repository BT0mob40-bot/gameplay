-- Enable realtime for wallets table for instant balance updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;