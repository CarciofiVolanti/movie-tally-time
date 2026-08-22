import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WatchedMovie {
  id: string;
  movie_title: string;
  proposed_by: string;
  poster?: string;
  genre?: string;
  runtime?: string;
  year?: string;
  director?: string;
  imdb_rating?: string;
  watched_at: string;
}

export interface DetailedRating {
  id: string;
  watched_movie_id: string;
  person_id: string;
  rating: number | null;
  present: boolean | null;
}

export interface Person {
  id: string;
  name: string;
}

export interface MovieProposal {
  id: string;
  movie_title: string;
  person_id: string;
  poster?: string;
  genre?: string;
  year?: string;
  imdb_rating?: string;
}

export interface MovieRating {
  proposal_id: string | null;
  watched_movie_id: string | null;
  person_id: string;
  rating: number;
}

const fetchStatsData = async (sessionId: string) => {
  const [moviesRes, peopleRes, proposalsRes] = await Promise.all([
    supabase.from("watched_movies").select("*").eq("session_id", sessionId),
    supabase.from("session_people").select("*").eq("session_id", sessionId),
    supabase.from("movie_proposals").select("*").eq("session_id", sessionId),
  ]);

  if (moviesRes.error) throw moviesRes.error;
  if (peopleRes.error) throw peopleRes.error;
  if (proposalsRes.error) throw proposalsRes.error;

  const watchedMovies: WatchedMovie[] = moviesRes.data ?? [];
  const people: Person[] = peopleRes.data ?? [];
  const proposals: MovieProposal[] = proposalsRes.data ?? [];

  const personIds = people.map(p => p.id);
  const movieIds = watchedMovies.map(m => m.id);

  const [ratingsRes, detailedRes] = await Promise.all([
    personIds.length > 0
      ? supabase.from("movie_ratings").select("proposal_id, watched_movie_id, person_id, rating").in("person_id", personIds)
      : Promise.resolve({ data: [] as MovieRating[], error: null }),
    movieIds.length > 0
      ? supabase.from("detailed_ratings").select("*").in("watched_movie_id", movieIds)
      : Promise.resolve({ data: [] as DetailedRating[], error: null }),
  ]);

  if (ratingsRes.error) throw ratingsRes.error;
  if (detailedRes.error) throw detailedRes.error;

  return {
    watchedMovies,
    people,
    proposals,
    proposalRatings: (ratingsRes.data ?? []) as MovieRating[],
    detailedRatings: (detailedRes.data ?? []) as DetailedRating[],
  };
};

export const useStatsData = (sessionId: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ["stats", sessionId],
    queryFn: () => fetchStatsData(sessionId),
    staleTime: 5 * 60 * 1000,
    enabled: !!sessionId,
  });

  return {
    watchedMovies: data?.watchedMovies ?? [],
    detailedRatings: data?.detailedRatings ?? [],
    proposals: data?.proposals ?? [],
    proposalRatings: data?.proposalRatings ?? [],
    people: data?.people ?? [],
    loading: isLoading,
  };
};
