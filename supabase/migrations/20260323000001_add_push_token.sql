-- Add push_token to profiles for Expo push notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
