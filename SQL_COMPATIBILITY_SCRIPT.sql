-- ============================================
-- SQL script for Supabase compatibility
-- Required tables/columns for reactions, comments, and subscriptions
-- ============================================

-- 1. Ensure profiles table exists with avatar column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar TEXT NOT NULL DEFAULT '💩';
  END IF;
END $$;

-- 2. Ensure reactions table exists
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('thumbs_up', 'heart', 'poop')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(event_id, user_id)
);

-- 3. Ensure comments table exists
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Ensure friends table has correct RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friends' AND policyname = 'Users can view own friends'
  ) THEN
    CREATE POLICY "Users can view own friends" ON public.friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = follower_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friends' AND policyname = 'Users can insert own subscriptions'
  ) THEN
    CREATE POLICY "Users can insert own subscriptions" ON public.friends FOR INSERT WITH CHECK (auth.uid() = follower_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friends' AND policyname = 'Users can delete own subscriptions'
  ) THEN
    CREATE POLICY "Users can delete own subscriptions" ON public.friends FOR DELETE USING (auth.uid() = follower_id);
  END IF;
END $$;

-- 5. Ensure events table has bristol_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'bristol_type'
  ) THEN
    ALTER TABLE public.events ADD COLUMN bristol_type INTEGER CHECK (bristol_type >= 1 AND bristol_type <= 7);
  END IF;
END $$;

-- 6. Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_follower_id ON public.friends(follower_id);
CREATE INDEX IF NOT EXISTS idx_reactions_event_id ON public.reactions(event_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_event_id ON public.comments(event_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- 7. Ensure RLS enabled on reactions and comments
ALTER TABLE IF EXISTS public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;

-- 8. Reactions policies
CREATE POLICY IF NOT EXISTS "Anyone can view reactions" ON public.reactions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can insert own reactions" ON public.reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own reactions" ON public.reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own reactions" ON public.reactions FOR DELETE USING (auth.uid() = user_id);

-- 9. Comments policies
CREATE POLICY IF NOT EXISTS "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Users can insert own comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- ГотовО! Выполните этот скрипт в Supabase SQL Editor,
-- если для работы Reaktion, комментариев или подписок
-- в базе не хватает каких-то таблиц, колонок или RLS-политик.
-- ============================================