-- ============================================
-- PoopTracker: уникальный регистронезависимый индекс для никнеймов
-- ============================================

-- 1. Удаляем возможные дубликаты по никнейму (оставляем самый старый профиль)
DELETE FROM public.profiles AS p1
USING public.profiles AS p2
WHERE LOWER(p1.username) = LOWER(p2.username)
  AND p1.id <> p2.id
  AND p1.updated_at > p2.updated_at;

-- 2. Создаём уникальный регистронезависимый индекс на никнейм
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (LOWER(username));

-- ============================================
-- Готово! Выполните этот скрипт в Supabase SQL Editor.
-- ============================================