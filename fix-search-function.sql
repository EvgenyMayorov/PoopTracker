-- ============================================
-- ИСПРАВЛЕННАЯ ФУНКЦИЯ ПОИСКА
-- ============================================

-- Удаляем старую функцию
DROP FUNCTION IF EXISTS public.search_users_by_email(TEXT, UUID);

-- Создаём новую функцию с LEFT JOIN
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
-- ГОТОВО! Теперь поиск найдёт всех пользователей
-- ============================================
