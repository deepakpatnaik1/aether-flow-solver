-- Create function to restrict access to authorized email only
CREATE OR REPLACE FUNCTION public.check_authorized_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow the authorized email
  IF NEW.email != 'deepakpatnaik1@gmail.com' THEN
    RAISE EXCEPTION 'Access denied: This application is restricted to authorized users only.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to check authorized user on auth.users table
DROP TRIGGER IF EXISTS check_authorized_user_trigger ON auth.users;
CREATE TRIGGER check_authorized_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_authorized_user();