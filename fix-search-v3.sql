-- ============================================
-- ИСПРАВЛЕННАЯ ФУНКЦИЯ ПОИСКА (v3)
-- Исправлена ошибка 42804: несоответствие типов
-- ============================================

-- Удаляем старую функцию
DROP FUNCTION IF EXISTS public.search_users_by_email(TEXT, UUID);

-- Создаём новую функцию с явным приведением типов
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
    COALESCE(p.username, 'Пользователь')::TEXT as username,
    u.email::TEXT as email
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE u.email::TEXT ILIKE '%' || search_email || '%'
    AND u.id != current_user_id
  LIMIT 20;
END;
$$;

-- Даём права на выполнение функции
GRANT EXECUTE ON FUNCTION public.search_users_by_email(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_by_email(TEXT, UUID) TO anon;

-- ============================================
-- ГОТОВО! Теперь поиск должен работать
-- ============================================
