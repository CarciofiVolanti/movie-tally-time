-- Preserve the source proposal id so repeated requests can recognize a move
-- that has already completed, even after the proposal row has been deleted.
ALTER TABLE public.watched_movies
  ADD COLUMN source_proposal_id UUID UNIQUE;

CREATE OR REPLACE FUNCTION public.mark_movie_as_watched(p_proposal_id UUID)
RETURNS TABLE (watched_movie_id UUID, movie_title TEXT, already_watched BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proposal_row public.movie_proposals%ROWTYPE;
  watched_id UUID;
BEGIN
  -- Serialize simultaneous requests for the same proposal.
  SELECT * INTO proposal_row
  FROM public.movie_proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY
      SELECT wm.id, wm.movie_title, TRUE
      FROM public.watched_movies wm
      WHERE wm.source_proposal_id = p_proposal_id;

    IF FOUND THEN
      RETURN;
    END IF;

    RAISE EXCEPTION 'Movie proposal not found';
  END IF;

  INSERT INTO public.watched_movies (
    session_id, movie_title, proposed_by, poster, genre, runtime, year,
    director, plot, imdb_rating, imdb_id, watched_at, source_proposal_id
  )
  SELECT
    proposal_row.session_id,
    proposal_row.movie_title,
    COALESCE(sp.name, 'Unknown'),
    proposal_row.poster,
    proposal_row.genre,
    proposal_row.runtime,
    proposal_row.year,
    proposal_row.director,
    proposal_row.plot,
    proposal_row.imdb_rating,
    proposal_row.imdb_id,
    now(),
    proposal_row.id
  FROM public.session_people sp
  WHERE sp.id = proposal_row.person_id
  RETURNING id INTO watched_id;

  IF watched_id IS NULL THEN
    RAISE EXCEPTION 'Movie proposer not found';
  END IF;

  UPDATE public.movie_ratings
  SET watched_movie_id = watched_id, proposal_id = NULL
  WHERE proposal_id = proposal_row.id;

  DELETE FROM public.proposal_comments
  WHERE proposal_id = proposal_row.id;

  DELETE FROM public.movie_proposals
  WHERE id = proposal_row.id;

  RETURN QUERY SELECT watched_id, proposal_row.movie_title, FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_movie_as_watched(UUID) TO public, anon, authenticated;

-- Enable watched movie INSERT events on the existing session realtime channel.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'watched_movies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.watched_movies;
  END IF;
END;
$$;
