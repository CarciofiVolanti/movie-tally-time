export interface WatchedMovie {
  id: string;
  movie_title: string;
  proposed_by: string;
  poster?: string;
  genre?: string;
  runtime?: string;
  year?: string;
  director?: string;
  plot?: string;
  imdb_rating?: string;
  imdb_id?: string;
  watched_at: string;
}

export interface DetailedRating {
  id: string;
  watched_movie_id: string;
  person_id: string;
  rating: number | null;
  present?: boolean;
}

export interface Person {
  id: string;
  name: string;
  is_present: boolean;
}

export interface WatchedMoviesProps {
  sessionId: string;
  onBack: () => void;
  selectedPersonId?: string;
}

export interface WatchedMoviesData {
  watchedMovies: WatchedMovie[];
  detailedRatings: DetailedRating[];
  people: Person[];
  setDetailedRatings: React.Dispatch<React.SetStateAction<DetailedRating[]>>;
  loadData: () => Promise<void>;
}

export type RateSortMode = "date-desc" | "date-asc" | "voted" | "not-voted" | "absent" | "not-fully-rated";

export interface MovieSearchResult {
  title: string;
  year?: string;
  poster?: string;
  genre?: string;
  runtime?: string;
  director?: string;
  plot?: string;
  imdbRating?: string;
  imdbId?: string;
}
