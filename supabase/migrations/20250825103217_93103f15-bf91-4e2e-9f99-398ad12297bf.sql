-- Add movie details columns to movie_proposals table
ALTER TABLE public.movie_proposals 
ADD COLUMN poster TEXT,
ADD COLUMN genre TEXT,
ADD COLUMN runtime TEXT,
ADD COLUMN year TEXT,
ADD COLUMN director TEXT,
ADD COLUMN plot TEXT,
ADD COLUMN imdb_rating TEXT,
ADD COLUMN imdb_id TEXT;