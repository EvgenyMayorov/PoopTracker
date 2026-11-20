-- ============================================
-- Push Subscriptions Table for Web Push Notifications
-- ============================================

-- 1. Создаём таблицу push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- 2. Включаем Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Политики для push_subscriptions
-- Пользователи могут видеть только свои подписки
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователи могут вставлять/обновлять свои подписки
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Пользователи могут удалять свои подписки
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Service role (Edge Functions) может читать все подписки для отправки пушей
DROP POLICY IF EXISTS "Service role can read all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role can read all push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================
-- Готово! Таблица для push-подписок создана
-- ============================================