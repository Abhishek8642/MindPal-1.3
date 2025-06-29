/*
  # Create chat and video session tables

  1. New Tables
    - `chat_sessions` - Individual chat sessions with AI
    - `chat_messages` - Messages within chat sessions
    - `mood_analytics` - Analytics and reports for mood data
    - `video_sessions` - Video consultation sessions

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users (with existence checks)

  3. Performance
    - Add indexes for better query performance
    - Add triggers for automatic timestamp updates
*/

-- Chat sessions table for managing conversations
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_sessions' 
    AND policyname = 'Users can manage own chat sessions'
  ) THEN
    CREATE POLICY "Users can manage own chat sessions"
      ON chat_sessions
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Chat messages table for individual messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('user', 'ai')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' 
    AND policyname = 'Users can manage own chat messages'
  ) THEN
    CREATE POLICY "Users can manage own chat messages"
      ON chat_messages
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Mood analytics table for reports
CREATE TABLE IF NOT EXISTS mood_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth_users(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  analysis_type text NOT NULL CHECK (analysis_type IN ('mood_report', 'stress_analysis', 'emotion_summary')),
  analysis_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mood_analytics ENABLE ROW LEVEL SECURITY;

-- Create policy only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mood_analytics' 
    AND policyname = 'Users can manage own mood analytics'
  ) THEN
    CREATE POLICY "Users can manage own mood analytics"
      ON mood_analytics
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Video sessions table for video consultations
CREATE TABLE IF NOT EXISTS video_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id text NOT NULL,
  conversation_id text,
  session_config jsonb,
  duration_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'video_sessions' 
    AND policyname = 'Users can manage own video sessions'
  ) THEN
    CREATE POLICY "Users can manage own video sessions"
      ON video_sessions
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_analytics_user_id ON mood_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_analytics_session_id ON mood_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_user_id ON video_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_created_at ON video_sessions(created_at);

-- Function to update chat session when new message is added (create or replace)
CREATE OR REPLACE FUNCTION update_chat_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions 
  SET updated_at = now() 
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers only if they don't exist
DO $$
BEGIN
  -- Update chat sessions updated_at trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_chat_sessions_updated_at'
  ) THEN
    CREATE TRIGGER update_chat_sessions_updated_at
      BEFORE UPDATE ON chat_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Trigger to update chat session timestamp
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_session_on_message'
  ) THEN
    CREATE TRIGGER update_session_on_message
      AFTER INSERT ON chat_messages
      FOR EACH ROW
      EXECUTE FUNCTION update_chat_session_on_message();
  END IF;
END $$;