-- Create watched_movies table for movies that have been marked as watched
CREATE TABLE public.watched_movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  movie_title TEXT NOT NULL,
  proposed_by TEXT NOT NULL,
  poster TEXT,
  genre TEXT,
  runtime TEXT,
  year TEXT,
  director TEXT,
  plot TEXT,
  imdb_rating TEXT,
  imdb_id TEXT,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create detailed_ratings table for 0-10 ratings with half votes
CREATE TABLE public.detailed_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  watched_movie_id UUID NOT NULL,
  person_id UUID NOT NULL,
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(watched_movie_id, person_id)
);

-- Enable Row Level Security
ALTER TABLE public.watched_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detailed_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching existing pattern)
CREATE POLICY "Public access to watched_movies" 
ON public.watched_movies 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Public access to detailed_ratings" 
ON public.detailed_ratings 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_watched_movies_updated_at
BEFORE UPDATE ON public.watched_movies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_detailed_ratings_updated_at
BEFORE UPDATE ON public.detailed_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();