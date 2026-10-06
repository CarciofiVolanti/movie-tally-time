-- Migration: Harden Row Level Security (RLS) policies with no-login architecture
-- Date: 2026-10-06

-- -----------------------------------------------------------------------------
-- 1. Anti-Scraping RPC Functions for movie_sessions
-- -----------------------------------------------------------------------------

-- Fetch session by exact UUID (bypasses direct table SELECT to prevent enumeration)
CREATE OR REPLACE FUNCTION public.get_movie_session(p_id UUID)
RETURNS SETOF public.movie_sessions
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.movie_sessions WHERE id = p_id;
$$;

-- Create session safely (bypasses direct table INSERT)
CREATE OR REPLACE FUNCTION public.create_movie_session(p_name TEXT)
RETURNS SETOF public.movie_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF trim(p_name) = '' THEN
    RAISE EXCEPTION 'Session name cannot be empty';
  END IF;
  RETURN QUERY
  INSERT INTO public.movie_sessions (name)
  VALUES (trim(p_name))
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_movie_session(UUID) TO public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_movie_session(TEXT) TO public, anon, authenticated;

-- Helper to safely verify session exists without exposing movie_sessions to direct SELECT
CREATE OR REPLACE FUNCTION public.session_exists(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.movie_sessions WHERE id = p_id);
$$;

GRANT EXECUTE ON FUNCTION public.session_exists(UUID) TO public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Drop Legacy Permissive Blanket Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public access to movie_sessions" ON public.movie_sessions;
DROP POLICY IF EXISTS "Public access to session_people" ON public.session_people;
DROP POLICY IF EXISTS "Public access to movie_proposals" ON public.movie_proposals;
DROP POLICY IF EXISTS "Public access to movie_ratings" ON public.movie_ratings;
DROP POLICY IF EXISTS "Public access to watched_movies" ON public.watched_movies;
DROP POLICY IF EXISTS "Public access to detailed_ratings" ON public.detailed_ratings;
DROP POLICY IF EXISTS "Public access to favourite_movies" ON public.favourite_movies;
DROP POLICY IF EXISTS "public access to proposal_comment" ON public.proposal_comments;

-- Also drop any policies if this migration is re-run
DROP POLICY IF EXISTS "session_people_select" ON public.session_people;
DROP POLICY IF EXISTS "session_people_insert" ON public.session_people;
DROP POLICY IF EXISTS "session_people_update" ON public.session_people;
DROP POLICY IF EXISTS "session_people_delete" ON public.session_people;

DROP POLICY IF EXISTS "movie_proposals_select" ON public.movie_proposals;
DROP POLICY IF EXISTS "movie_proposals_insert" ON public.movie_proposals;
DROP POLICY IF EXISTS "movie_proposals_update" ON public.movie_proposals;
DROP POLICY IF EXISTS "movie_proposals_delete" ON public.movie_proposals;

DROP POLICY IF EXISTS "movie_ratings_select" ON public.movie_ratings;
DROP POLICY IF EXISTS "movie_ratings_insert" ON public.movie_ratings;
DROP POLICY IF EXISTS "movie_ratings_update" ON public.movie_ratings;
DROP POLICY IF EXISTS "movie_ratings_delete" ON public.movie_ratings;

DROP POLICY IF EXISTS "watched_movies_select" ON public.watched_movies;
DROP POLICY IF EXISTS "watched_movies_insert" ON public.watched_movies;

DROP POLICY IF EXISTS "detailed_ratings_select" ON public.detailed_ratings;
DROP POLICY IF EXISTS "detailed_ratings_insert" ON public.detailed_ratings;
DROP POLICY IF EXISTS "detailed_ratings_update" ON public.detailed_ratings;

DROP POLICY IF EXISTS "favourite_movies_select" ON public.favourite_movies;
DROP POLICY IF EXISTS "favourite_movies_insert" ON public.favourite_movies;
DROP POLICY IF EXISTS "favourite_movies_update" ON public.favourite_movies;
DROP POLICY IF EXISTS "favourite_movies_delete" ON public.favourite_movies;

DROP POLICY IF EXISTS "proposal_comments_select" ON public.proposal_comments;
DROP POLICY IF EXISTS "proposal_comments_insert" ON public.proposal_comments;
DROP POLICY IF EXISTS "proposal_comments_update" ON public.proposal_comments;
DROP POLICY IF EXISTS "proposal_comments_delete" ON public.proposal_comments;

-- -----------------------------------------------------------------------------
-- 3. Table: movie_sessions
-- Direct SELECT/INSERT/UPDATE/DELETE are not permitted for public.
-- All interactions must use get_movie_session and create_movie_session.
-- -----------------------------------------------------------------------------
ALTER TABLE public.movie_sessions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4. Table: session_people
-- -----------------------------------------------------------------------------
ALTER TABLE public.session_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_people_select" ON public.session_people
  FOR SELECT TO public
  USING (true);

CREATE POLICY "session_people_insert" ON public.session_people
  FOR INSERT TO public
  WITH CHECK (
    length(trim(name)) > 0 AND
    public.session_exists(session_id)
  );

CREATE POLICY "session_people_update" ON public.session_people
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (
    length(trim(name)) > 0 AND
    public.session_exists(session_id)
  );

CREATE POLICY "session_people_delete" ON public.session_people
  FOR DELETE TO public
  USING (true);

-- -----------------------------------------------------------------------------
-- 5. Table: movie_proposals
-- -----------------------------------------------------------------------------
ALTER TABLE public.movie_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movie_proposals_select" ON public.movie_proposals
  FOR SELECT TO public
  USING (true);

CREATE POLICY "movie_proposals_insert" ON public.movie_proposals
  FOR INSERT TO public
  WITH CHECK (
    length(trim(movie_title)) > 0 AND
    EXISTS (
      SELECT 1 FROM public.session_people sp
      WHERE sp.id = person_id AND sp.session_id = session_id
    )
  );

CREATE POLICY "movie_proposals_update" ON public.movie_proposals
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_people sp
      WHERE sp.id = person_id AND sp.session_id = session_id
    )
  );

CREATE POLICY "movie_proposals_delete" ON public.movie_proposals
  FOR DELETE TO public
  USING (true);

-- -----------------------------------------------------------------------------
-- 6. Table: movie_ratings
-- -----------------------------------------------------------------------------
ALTER TABLE public.movie_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movie_ratings_select" ON public.movie_ratings
  FOR SELECT TO public
  USING (true);

CREATE POLICY "movie_ratings_insert" ON public.movie_ratings
  FOR INSERT TO public
  WITH CHECK (
    rating >= 0 AND rating <= 5 AND
    (
      (proposal_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.movie_proposals mp
        JOIN public.session_people sp ON sp.id = movie_ratings.person_id
        WHERE mp.id = movie_ratings.proposal_id AND mp.session_id = sp.session_id
      ))
      OR
      (watched_movie_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.watched_movies wm
        JOIN public.session_people sp ON sp.id = movie_ratings.person_id
        WHERE wm.id = movie_ratings.watched_movie_id AND wm.session_id = sp.session_id
      ))
    )
  );

CREATE POLICY "movie_ratings_update" ON public.movie_ratings
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (
    rating >= 0 AND rating <= 5
  );

CREATE POLICY "movie_ratings_delete" ON public.movie_ratings
  FOR DELETE TO public
  USING (true);

-- -----------------------------------------------------------------------------
-- 7. Table: watched_movies
-- UPDATE and DELETE are permanently forbidden.
-- -----------------------------------------------------------------------------
ALTER TABLE public.watched_movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watched_movies_select" ON public.watched_movies
  FOR SELECT TO public
  USING (true);

CREATE POLICY "watched_movies_insert" ON public.watched_movies
  FOR INSERT TO public
  WITH CHECK (
    length(trim(movie_title)) > 0 AND
    length(trim(proposed_by)) > 0 AND
    public.session_exists(session_id)
  );

-- -----------------------------------------------------------------------------
-- 8. Table: detailed_ratings
-- DELETE is permanently forbidden.
-- -----------------------------------------------------------------------------
ALTER TABLE public.detailed_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "detailed_ratings_select" ON public.detailed_ratings
  FOR SELECT TO public
  USING (true);

CREATE POLICY "detailed_ratings_insert" ON public.detailed_ratings
  FOR INSERT TO public
  WITH CHECK (
    (rating IS NULL OR (rating >= 0 AND rating <= 10)) AND
    EXISTS (
      SELECT 1 FROM public.watched_movies wm
      JOIN public.session_people sp ON sp.id = detailed_ratings.person_id
      WHERE wm.id = detailed_ratings.watched_movie_id AND wm.session_id = sp.session_id
    )
  );

CREATE POLICY "detailed_ratings_update" ON public.detailed_ratings
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (
    (rating IS NULL OR (rating >= 0 AND rating <= 10)) AND
    EXISTS (
      SELECT 1 FROM public.watched_movies wm
      JOIN public.session_people sp ON sp.id = detailed_ratings.person_id
      WHERE wm.id = detailed_ratings.watched_movie_id AND wm.session_id = sp.session_id
    )
  );

-- -----------------------------------------------------------------------------
-- 9. Table: favourite_movies
-- -----------------------------------------------------------------------------
ALTER TABLE public.favourite_movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favourite_movies_select" ON public.favourite_movies
  FOR SELECT TO public
  USING (true);

CREATE POLICY "favourite_movies_insert" ON public.favourite_movies
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.movie_proposals mp
      JOIN public.session_people sp ON sp.id = favourite_movies.person_id
      WHERE mp.id = favourite_movies.proposal_id AND mp.session_id = sp.session_id
    )
  );

CREATE POLICY "favourite_movies_update" ON public.favourite_movies
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.movie_proposals mp
      JOIN public.session_people sp ON sp.id = favourite_movies.person_id
      WHERE mp.id = favourite_movies.proposal_id AND mp.session_id = sp.session_id
    )
  );

CREATE POLICY "favourite_movies_delete" ON public.favourite_movies
  FOR DELETE TO public
  USING (true);

-- -----------------------------------------------------------------------------
-- 10. Table: proposal_comments
-- -----------------------------------------------------------------------------
ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_comments_select" ON public.proposal_comments
  FOR SELECT TO public
  USING (true);

CREATE POLICY "proposal_comments_insert" ON public.proposal_comments
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.movie_proposals mp WHERE mp.id = proposal_id)
  );

CREATE POLICY "proposal_comments_update" ON public.proposal_comments
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.movie_proposals mp WHERE mp.id = proposal_id)
  );

CREATE POLICY "proposal_comments_delete" ON public.proposal_comments
  FOR DELETE TO public
  USING (true);
