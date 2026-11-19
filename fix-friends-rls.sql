-- Fix RLS policies for friends table

-- 1. View own friends (both subscriptions and followers)
DROP POLICY IF EXISTS "Users can view own friends" ON public.friends;
CREATE POLICY "Users can view own friends"
  ON public.friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = follower_id);

-- 2. Insert own subscription (follow someone)
-- When user A follows user B, row is: user_id=B, follower_id=A
-- So user A should be able to insert where follower_id = auth.uid()
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.friends;
CREATE POLICY "Users can insert own subscriptions"
  ON public.friends FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- 3. Delete own subscription (unfollow)
-- User A should be able to delete where follower_id = auth.uid()
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.friends;
CREATE POLICY "Users can delete own subscriptions"
  ON public.friends FOR DELETE
  USING (auth.uid() = follower_id);