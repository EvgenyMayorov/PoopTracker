-- ============================================
-- ДИАГНОСТИКА: Проверка проблемы с поиском
-- ============================================

-- 1. Проверяем, есть ли пользователь в auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'mashalee88@gmail.com';

-- 2. Проверяем, есть ли профиль
SELECT id, username 
FROM public.profiles 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'mashalee88@gmail.com');

-- 3. Тестируем функцию напрямую (замените YOUR_USER_ID на ваш UUID)
-- SELECT * FROM public.search_users_by_email('mashalee88', 'YOUR_USER_ID');

-- 4. Проверяем, какие функции существуют
SELECT routine_name, routine_type, data_type 
FROM information_schema.routines 
WHERE routine_name = 'search_users_by_email';

-- ============================================
-- ИСПРАВЛЕНИЕ: Пересоздаём функцию с правильными правами
-- ============================================

-- Удаляем старую функцию
DROP FUNCTION IF EXISTS public.search_users_by_email(TEXT, UUID);

-- Создаём новую функцию с явным указанием search_path
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
SET search_path TO public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    COALESCE(p.username, 'Пользователь') as username,
    u.email
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE u.email ILIKE '%' || search_email || '%'
    AND u.id != current_user_id
  LIMIT 20;
END;
$$;

-- Даём права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION public.search_users_by_email(TEXT, UUID) TO authenticated;

-- ============================================
-- АЛЬТЕРНАТИВА: Если функция всё ещё не работает,
-- используем представление (view) для обхода RLS
-- ============================================

-- Создаём представление, доступное для чтения
CREATE OR REPLACE VIEW public.user_search AS
SELECT 
  u.id,
  COALESCE(p.username, 'Пользователь') as username,
  u.email
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

-- Даём права на чтение представления
GRANT SELECT ON public.user_search TO authenticated;

-- ============================================
-- ГОТОВО!
-- ============================================
