-- ============================================
-- ДОБАВЛЕНИЕ ПОЛЯ AVATAR В ТАБЛИЦУ PROFILES
-- ============================================

-- Проверяем, существует ли поле avatar
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar'
  ) THEN
    -- Добавляем поле avatar с дефолтным значением
    ALTER TABLE public.profiles ADD COLUMN avatar TEXT DEFAULT '💩';
    RAISE NOTICE 'Поле avatar добавлено в таблицу profiles';
  ELSE
    RAISE NOTICE 'Поле avatar уже существует в таблице profiles';
  END IF;
END $$;

-- ============================================
-- ГОТОВО! Теперь пользователи могут иметь аватарки
-- ============================================
