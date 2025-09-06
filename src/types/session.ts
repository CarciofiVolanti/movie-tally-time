export interface MovieDetails {
  poster?: string;
  genre?: string;
  runtime?: string;
  year?: string;
  director?: string;
  plot?: string;
  imdbRating?: string | number;
  imdbId?: string;
}

export interface MovieRating {
  movieTitle: string;
  proposedBy: string;
  ratings: Record<string, number>;
  details?: MovieDetails;
}

export interface Person {
  id: string;
  name: string;
  isPresent: boolean;
  movies: string[];
}

export interface MovieWithStats extends MovieRating {
  averageRating: number;
  totalRatings: number;
}
