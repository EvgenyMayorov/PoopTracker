-- ============================================
-- Полный скрипт для реакций, комментариев и уведомлений
-- ============================================

-- 1. Создаём таблицу notifications (уведомления)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_username TEXT NOT NULL,
  notification_type TEXT DEFAULT 'poop' CHECK (notification_type IN ('poop', 'reaction', 'comment')),
  event_id BIGINT REFERENCES public.events(id) ON DELETE CASCADE,
  reaction_type TEXT CHECK (reaction_type IN ('thumbs_up', 'heart', 'poop')),
  comment_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Создаём таблицу reactions (реакции на события)
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id BIGINT REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('thumbs_up', 'heart', 'poop')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(event_id, user_id)
);

-- 3. Создаём таблицу comments (комментарии к событиям)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id BIGINT REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_event_id ON public.reactions(event_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_event_id ON public.comments(event_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- 5. Включаем Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 6. Политики для notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Политики для reactions
CREATE POLICY "Anyone can view reactions"
  ON public.reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own reactions"
  ON public.reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions"
  ON public.reactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);

-- 8. Политики для comments
CREATE POLICY "Anyone can view comments"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Готово! Теперь можно использовать реакции, комментарии и уведомления
-- ============================================
