export interface MovieDetails {
  poster?: string | null;
  year?: string | null;
  director?: string | null;
  runtime?: string | null;
  genre?: string | null;
  imdbId?: string | null;
  plot?: string | null;
  imdbRating?: string | null;
  // any other metadata you use
}

export interface MovieRating {
  movieTitle: string;
  proposedBy: string;
  ratings: Record<string, number>;
  details?: MovieDetails;
  // attached from movie_proposals so UI can rely on stable ids
  proposalId?: string;
  proposerId?: string;
  comment?: string;
}

// If you have MovieWithStats / MovieWithDetails types:
export interface MovieWithStats {
  // display / identity
  movieTitle: string;
  proposedBy?: string | null; // display name
  proposalId?: string | null; // movie_proposals.id (preferred)
  proposerId?: string | null; // movie_proposals.person_id (preferred)

  // ratings from present/absent people (keyed by person id)
  ratings: Record<string, number | null>; // 1-5 (or null when reset)

  // computed summary values
  totalRatings: number; // number of ratings considered
  averageRating: number; // average from present people

  // optional fetched details
  details?: MovieDetails | null;
}

export interface Person {
  id: string;
  name: string;
  isPresent: boolean;
  movies: string[];
}

export interface FavouriteMovie {
  id: string;
  person_id: string;
  proposal_id: string;
  created_at?: string;
  updated_at?: string;
}