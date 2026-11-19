-- ============================================
-- Добавление поля для эмодзи-аватара и RLS-политики UPDATE
-- (безопасный скрипт: DROP POLICY IF EXISTS перед CREATE POLICY)
-- ============================================

-- 1. Добавляем колонку avatar в таблицу profiles, если её ещё нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'avatar'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar TEXT NOT NULL DEFAULT '💩';
    RAISE NOTICE 'Added column avatar to profiles';
  ELSE
    RAISE NOTICE 'Column avatar already exists in profiles';
  END IF;
END $$;

-- 2. Для существующих строк, где avatar NULL, устанавливаем значение по умолчанию
UPDATE public.profiles
SET avatar = '💩'
WHERE avatar IS NULL;

-- 3. Удаляем старые политики UPDATE, если они существуют (DROP перед CREATE — безопасно)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3.1. Создаём/обновляем RLS-политику UPDATE на таблицу profiles
-- (пользователь может обновлять только свой собственный профиль)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. RLS-политика SELECT (все пользователи могут видеть профили для поиска/друзей)
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

-- 5. RLS-политика INSERT (пользователь может создавать только свой профиль)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- SQL-скрипт готов! Выполните его в Supabase SQL Editor.
-- ============================================