-- Migration: Fix RLS subquery recursion and column shadowing
-- Date: 2026-10-06

-- 1. Helper function to check session existence without requiring direct SELECT on movie_sessions
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

-- 2. Fix session_people policies (use session_exists to avoid recursive RLS failure)
DROP POLICY IF EXISTS "session_people_insert" ON public.session_people;
CREATE POLICY "session_people_insert" ON public.session_people
  FOR INSERT TO public
  WITH CHECK (
    length(trim(name)) > 0 AND
    public.session_exists(session_id)
  );

DROP POLICY IF EXISTS "session_people_update" ON public.session_people;
CREATE POLICY "session_people_update" ON public.session_people
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (
    length(trim(name)) > 0 AND
    public.session_exists(session_id)
  );

-- 3. Fix watched_movies_insert policy (use session_exists)
DROP POLICY IF EXISTS "watched_movies_insert" ON public.watched_movies;
CREATE POLICY "watched_movies_insert" ON public.watched_movies
  FOR INSERT TO public
  WITH CHECK (
    length(trim(movie_title)) > 0 AND
    length(trim(proposed_by)) > 0 AND
    public.session_exists(session_id)
  );

-- 4. Fix movie_ratings_insert policy (qualify table to avoid shadowing mp.person_id)
DROP POLICY IF EXISTS "movie_ratings_insert" ON public.movie_ratings;
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

-- 5. Fix favourite_movies policies (qualify table to avoid shadowing mp.person_id)
DROP POLICY IF EXISTS "favourite_movies_insert" ON public.favourite_movies;
CREATE POLICY "favourite_movies_insert" ON public.favourite_movies
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.movie_proposals mp
      JOIN public.session_people sp ON sp.id = favourite_movies.person_id
      WHERE mp.id = favourite_movies.proposal_id AND mp.session_id = sp.session_id
    )
  );

DROP POLICY IF EXISTS "favourite_movies_update" ON public.favourite_movies;
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

-- 6. Fix detailed_ratings policies (explicitly qualify detailed_ratings)
DROP POLICY IF EXISTS "detailed_ratings_insert" ON public.detailed_ratings;
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

DROP POLICY IF EXISTS "detailed_ratings_update" ON public.detailed_ratings;
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

