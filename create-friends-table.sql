-- ============================================
-- СОЗДАНИЕ ТАБЛИЦЫ FRIENDS
-- ============================================

-- Создаём таблицу friends (подписки)
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, follower_id)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_follower_id ON public.friends(follower_id);

-- Включаем Row Level Security
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Политики для friends
CREATE POLICY "Users can view own friends"
  ON public.friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = follower_id);

CREATE POLICY "Users can insert own subscriptions"
  ON public.friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON public.friends FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- ГОТОВО! Теперь подписки должны работать
-- ============================================
