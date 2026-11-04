-- ============================================
-- Диагностика проблемы с сохранением bristol_type
-- ============================================

-- 1. Проверка структуры таблицы events
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'events'
ORDER BY ordinal_position;

-- 2. Проверка последних 10 событий
SELECT 
    id,
    user_id,
    bristol_type,
    created_at
FROM events 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Проверка RLS политик для таблицы events
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'events';

-- 4. Проверка текущей сессии (кто вы)
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_email;

-- 5. Тестовое обновление (замените YOUR_EVENT_ID на реальный ID)
-- UPDATE events 
-- SET bristol_type = 4 
-- WHERE id = 'YOUR_EVENT_ID'
-- RETURNING *;

-- 6. Проверка прав доступа
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'events';

-- ============================================
-- Если RLS блокирует обновление, выполните:
-- ============================================

-- Временное отключение RLS для тестирования (НЕ ДЛЯ ПРОДАКШЕНА!)
-- ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Или добавьте политику для обновления:
-- CREATE POLICY "Users can update own events"
-- ON events
-- FOR UPDATE
-- USING (auth.uid() = user_id);

-- ============================================
-- Готово! Проверьте результаты запросов выше
-- ============================================
