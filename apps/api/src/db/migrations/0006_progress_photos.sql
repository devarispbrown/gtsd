-- Migration: Progress Photos
-- Description: Add photos table and task_evidence junction table for linking photos to tasks
-- Created: 2025-10-01

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Evidence type enum for task_evidence table
CREATE TYPE photo_evidence_type AS ENUM ('before', 'during', 'after');

-- ============================================================================
-- PHOTOS TABLE
-- ============================================================================

CREATE TABLE photos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- S3 storage details
  file_key TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- bytes
  mime_type VARCHAR(50) NOT NULL,

  -- Image metadata
  width INTEGER,
  height INTEGER,

  -- Timestamps
  taken_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for querying user's photos sorted by creation date
CREATE INDEX photos_user_created_idx ON photos(user_id, created_at DESC);

-- Unique index for file_key to prevent duplicates
CREATE UNIQUE INDEX photos_file_key_idx ON photos(file_key);

-- ============================================================================
-- TASK_EVIDENCE TABLE (Many-to-Many)
-- ============================================================================

CREATE TABLE task_evidence (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES daily_tasks(id) ON DELETE CASCADE,
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  evidence_type photo_evidence_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Unique index to prevent duplicate photo-task links
CREATE UNIQUE INDEX task_evidence_task_photo_idx ON task_evidence(task_id, photo_id);

-- Index for querying photos by task
CREATE INDEX task_evidence_photo_idx ON task_evidence(photo_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE photos IS 'Stores progress photos uploaded by users with S3 references';
COMMENT ON COLUMN photos.file_key IS 'S3 object key for the uploaded photo';
COMMENT ON COLUMN photos.file_size IS 'File size in bytes for storage tracking';
COMMENT ON COLUMN photos.mime_type IS 'MIME type (image/jpeg, image/png, image/heic)';
COMMENT ON COLUMN photos.taken_at IS 'When the photo was taken (user-provided)';
COMMENT ON COLUMN photos.uploaded_at IS 'When the photo was uploaded to S3';

COMMENT ON TABLE task_evidence IS 'Junction table linking photos to tasks as evidence';
COMMENT ON COLUMN task_evidence.evidence_type IS 'Type of evidence: before, during, or after';
