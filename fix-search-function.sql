-- ============================================
-- ДИАГНОСТИКА: Проверка проблемы с поиском
-- ============================================

-- 1. Проверка: есть ли пользователь с email mashalee88@gmail.com в auth.users?
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'mashalee88@gmail.com';

-- 2. Проверка: есть ли у этого пользователя запись в profiles?
SELECT 
  p.id,
  p.username,
  p.created_at,
  u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'mashalee88@gmail.com';

-- 3. Если запись в profiles отсутствует - создаём её вручную
-- (замените USERNAME на желаемое имя пользователя)
INSERT INTO public.profiles (id, username, created_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'username', 'user_' || substr(id::text, 1, 8)),
  NOW()
FROM auth.users
WHERE email = 'mashalee88@gmail.com'
  AND id NOT IN (SELECT id FROM public.profiles);

-- ============================================
-- ИСПРАВЛЕННАЯ ФУНКЦИЯ ПОИСКА
-- ============================================

-- Удаляем старую функцию
DROP FUNCTION IF EXISTS public.search_users_by_email(TEXT, UUID);

-- Создаём новую функцию, которая ищет в auth.users напрямую
CREATE OR REPLACE FUNCTION public.search_users_by_email(
  search_email TEXT,
  current_user_id UUID
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    COALESCE(p.username, 'user_' || substr(u.id::text, 1, 8)) as username,
    u.email
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE u.email ILIKE '%' || search_email || '%'
    AND u.id != current_user_id
  LIMIT 20;
END;
$$;

-- ============================================
-- ПРОВЕРКА: Тестируем функцию
-- ============================================

-- Замените YOUR_USER_ID на ваш реальный UUID
-- SELECT * FROM public.search_users_by_email('mashalee88', 'YOUR_USER_ID');

-- ============================================
-- ГОТОВО!
-- ============================================
