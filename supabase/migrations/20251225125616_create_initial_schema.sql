/*
  # Initial Schema for Teacher Workflow Platform (EdwinAI)

  ## Overview
  This migration creates the foundational database structure for a teacher workflow platform
  that integrates with Google Classroom and provides AI-assisted teaching tools.

  ## New Tables

  ### 1. `profiles`
  - `id` (uuid, references auth.users)
  - `email` (text)
  - `full_name` (text)
  - `google_classroom_token` (jsonb) - stores Google Classroom OAuth tokens
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `subjects`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles) - teacher who owns this subject
  - `title` (text) - e.g., "Networks and Security"
  - `description` (text)
  - `syllabus_url` (text) - URL to uploaded syllabus PDF
  - `google_classroom_id` (text) - ID from Google Classroom
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `chat_sessions`
  - `id` (uuid, primary key)
  - `subject_id` (uuid, references subjects)
  - `user_id` (uuid, references profiles)
  - `title` (text) - auto-generated or user-provided title
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `messages`
  - `id` (uuid, primary key)
  - `chat_session_id` (uuid, references chat_sessions)
  - `role` (text) - 'user' or 'assistant'
  - `content` (text)
  - `metadata` (jsonb) - for storing additional data like sources, etc.
  - `created_at` (timestamptz)

  ### 5. `syllabus_items`
  - `id` (uuid, primary key)
  - `subject_id` (uuid, references subjects)
  - `parent_id` (uuid, references syllabus_items) - for hierarchical structure
  - `title` (text)
  - `description` (text)
  - `order_index` (integer) - for sorting
  - `is_completed` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. `questions`
  - `id` (uuid, primary key)
  - `subject_id` (uuid, references subjects)
  - `syllabus_item_id` (uuid, references syllabus_items) - optional link to syllabus
  - `question_text` (text)
  - `marks` (integer) - 2, 16, etc.
  - `question_type` (text) - 'short', 'long', 'essay'
  - `metadata` (jsonb) - for storing additional data
  - `created_at` (timestamptz)

  ### 7. `students`
  - `id` (uuid, primary key)
  - `subject_id` (uuid, references subjects)
  - `name` (text)
  - `email` (text)
  - `google_classroom_id` (text)
  - `created_at` (timestamptz)

  ### 8. `resources`
  - `id` (uuid, primary key)
  - `subject_id` (uuid, references subjects)
  - `title` (text)
  - `description` (text)
  - `file_url` (text)
  - `file_type` (text)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Restrictive policies for all operations
*/

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  google_classroom_token jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  syllabus_url text,
  google_classroom_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects"
  ON subjects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects"
  ON subjects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects"
  ON subjects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat sessions"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions"
  ON chat_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from own chat sessions"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.chat_session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own chat sessions"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.chat_session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Create syllabus_items table
CREATE TABLE IF NOT EXISTS syllabus_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES syllabus_items(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE syllabus_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view syllabus items from own subjects"
  ON syllabus_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = syllabus_items.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert syllabus items to own subjects"
  ON syllabus_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = syllabus_items.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update syllabus items in own subjects"
  ON syllabus_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = syllabus_items.subject_id
      AND subjects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = syllabus_items.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete syllabus items from own subjects"
  ON syllabus_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = syllabus_items.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  syllabus_item_id uuid REFERENCES syllabus_items(id) ON DELETE SET NULL,
  question_text text NOT NULL,
  marks integer NOT NULL DEFAULT 2,
  question_type text NOT NULL DEFAULT 'short' CHECK (question_type IN ('short', 'long', 'essay')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view questions from own subjects"
  ON questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = questions.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert questions to own subjects"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = questions.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete questions from own subjects"
  ON questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = questions.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  google_classroom_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view students from own subjects"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = students.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert students to own subjects"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = students.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete students from own subjects"
  ON students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = students.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  file_url text NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resources from own subjects"
  ON resources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = resources.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert resources to own subjects"
  ON resources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = resources.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete resources from own subjects"
  ON resources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = resources.subject_id
      AND subjects.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_subject_id ON chat_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_session_id ON messages(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_items_subject_id ON syllabus_items(subject_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_items_parent_id ON syllabus_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_students_subject_id ON students(subject_id);
CREATE INDEX IF NOT EXISTS idx_resources_subject_id ON resources(subject_id);