-- ============================================
-- Проверка и добавление поля bristol_type
-- ============================================

-- Проверяем, существует ли поле bristol_type в таблице events
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'bristol_type'
  ) THEN
    -- Добавляем поле bristol_type, если его нет
    ALTER TABLE public.events ADD COLUMN bristol_type INTEGER CHECK (bristol_type >= 1 AND bristol_type <= 7);
    RAISE NOTICE 'Поле bristol_type добавлено в таблицу events';
  ELSE
    RAISE NOTICE 'Поле bristol_type уже существует в таблице events';
  END IF;
END $$;

-- Проверяем структуру таблицы events
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'events'
ORDER BY ordinal_position;

-- ============================================
-- Готово! Теперь тип по шкале Бристольской формы будет отображаться в ленте
-- ============================================
