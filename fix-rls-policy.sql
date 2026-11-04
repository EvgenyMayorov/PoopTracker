-- ============================================
-- Исправление RLS политик для таблицы events
-- ============================================

-- 1. Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Users can update own events" ON events;

-- 2. Создаём правильную политику для обновления
CREATE POLICY "Users can update own events"
ON events
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Проверяем, что политика создана
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'events'
AND cmd = 'UPDATE';

-- ============================================
-- Готово! Теперь обновление bristol_type должно работать
-- ============================================
