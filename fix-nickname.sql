-- ============================================
-- Nickname & Email Fix for PooTracker
-- ============================================

-- 1. Add email column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- 2. Update existing profiles with email from auth.users raw_user_meta_data
UPDATE public.profiles
SET email = auth.users.raw_user_meta_data->>'email'
FROM auth.users
WHERE auth.users.id = public.profiles.id;

-- 3. Update the handle_new_user trigger to also store email
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'email'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
CREATE TRIGGER handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure RLS policy allows viewing email (already 'Anyone can view profiles' selects all columns)
-- 5. Add index on email if needed for searches
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================
-- GOTOWE! Wykonaj ten skrypt w Supabase SQL Editor
-- ============================================
