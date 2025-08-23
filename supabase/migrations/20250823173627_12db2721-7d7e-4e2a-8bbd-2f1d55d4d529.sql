-- Create movie sessions table
CREATE TABLE public.movie_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session people table
CREATE TABLE public.session_people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.movie_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_present BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create movie proposals table
CREATE TABLE public.movie_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.movie_sessions(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.session_people(id) ON DELETE CASCADE,
  movie_title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create movie ratings table
CREATE TABLE public.movie_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.movie_proposals(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.session_people(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, person_id)
);

-- Enable Row Level Security
ALTER TABLE public.movie_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_ratings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public access for now since no auth is implemented)
CREATE POLICY "Public access to movie_sessions" ON public.movie_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to session_people" ON public.session_people FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to movie_proposals" ON public.movie_proposals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to movie_ratings" ON public.movie_ratings FOR ALL USING (true) WITH CHECK (true);

-- Create update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_movie_sessions_updated_at
  BEFORE UPDATE ON public.movie_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_movie_ratings_updated_at
  BEFORE UPDATE ON public.movie_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_session_people_session_id ON public.session_people(session_id);
CREATE INDEX idx_movie_proposals_session_id ON public.movie_proposals(session_id);
CREATE INDEX idx_movie_proposals_person_id ON public.movie_proposals(person_id);
CREATE INDEX idx_movie_ratings_proposal_id ON public.movie_ratings(proposal_id);
CREATE INDEX idx_movie_ratings_person_id ON public.movie_ratings(person_id);