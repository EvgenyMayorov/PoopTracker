-- ============================================
-- PoopTracker: Безопасное пересоздание RLS политик для таблицы events
-- Выполните этот скрипт в Supabase SQL Editor
-- ============================================

-- 1. Удаляем существующие политики для таблицы events (если есть)
DROP POLICY IF EXISTS "Users can view own events" ON public.events;
DROP POLICY IF EXISTS "Users can view events of people they follow" ON public.events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.events;
DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;

-- 2. Создаём правильные политики

-- Пользователи могут видеть только СВОИ события (для «Мои записи» / «Последние записи»)
CREATE POLICY "Users can view own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователи могут видеть события тех, на кого они ПОДПИСАНЫ (для ленты друзей / профиля друга)
CREATE POLICY "Users can view events of people they follow"
  ON public.events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friends
      WHERE friends.user_id = events.user_id
      AND friends.follower_id = auth.uid()
    )
  );

-- Пользователи могут создавать только СВОИ события
CREATE POLICY "Users can insert own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять только СВОИ события (например, bristol_type)
CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Пользователи могут удалять только СВОИ события
CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Проверяем, что все политики созданы
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'events'
ORDER BY policyname;

-- ============================================
-- Готово! Политики RLS для events обновлены.
-- ============================================