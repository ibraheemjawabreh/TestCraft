-- 1. Add slug column to challenges table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'slug'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN slug text;
    -- Optionally, we can enforce uniqueness if we want:
    -- ALTER TABLE public.challenges ADD CONSTRAINT challenges_slug_key UNIQUE (slug);
  END IF;
END $$;

-- 2. Add learning_path_id column to challenges table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'learning_path_id'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN learning_path_id uuid REFERENCES public.learning_paths(id);
  END IF;
END $$;
