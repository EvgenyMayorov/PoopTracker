-- ============================================
-- Функция для поиска пользователей по email
-- ============================================

-- Создаём функцию для поиска пользователей по email
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
    p.id,
    p.username,
    u.email
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE u.email ILIKE '%' || search_email || '%'
    AND p.id != current_user_id
  LIMIT 20;
END;
$$;

-- ============================================
-- Добавляем поддержку типа уведомления 'follow'
-- ============================================

-- Обновляем таблицу notifications для поддержки типа 'follow'
ALTER TABLE public.notifications 
  DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_notification_type_check 
  CHECK (notification_type IN ('poop', 'reaction', 'comment', 'follow'));

-- ============================================
-- Готово! Теперь можно искать пользователей по email
-- и отправлять уведомления о подписке
-- ============================================
