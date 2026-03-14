import { useState, useEffect } from "react";
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

export const useStatsData = (sessionId: string) => {
  const [watchedMovies, setWatchedMovies] = useState<WatchedMovie[]>([]);
  const [detailedRatings, setDetailedRatings] = useState<DetailedRating[]>([]);
  const [proposals, setProposals] = useState<MovieProposal[]>([]);
  const [proposalRatings, setProposalRatings] = useState<MovieRating[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      if (!sessionId) return;
      
      setLoading(true);
      try {
        // 1. Fetch basic session data
        const [moviesRes, peopleRes, proposalsRes] = await Promise.all([
          supabase.from("watched_movies").select("*").eq("session_id", sessionId),
          supabase.from("session_people").select("*").eq("session_id", sessionId),
          supabase.from("movie_proposals").select("*").eq("session_id", sessionId),
        ]);

        if (!mounted) return;

        if (moviesRes.error) throw moviesRes.error;
        if (peopleRes.error) throw peopleRes.error;
        if (proposalsRes.error) throw proposalsRes.error;

        const movies = moviesRes.data || [];
        const currentPeople = peopleRes.data || [];
        const currentProposals = proposalsRes.data || [];

        setWatchedMovies(movies);
        setPeople(currentPeople);
        setProposals(currentProposals);
        
        // 2. Fetch all ratings for these people in this session
        const personIds = currentPeople.map(p => p.id);
        if (personIds.length > 0) {
          const { data: ratingsData, error: ratingsError } = await supabase
            .from("movie_ratings")
            .select("proposal_id, watched_movie_id, person_id, rating")
            .in("person_id", personIds);

          if (ratingsError) {
            console.error("Error fetching movie ratings:", ratingsError);
          } else if (mounted) {
            setProposalRatings(ratingsData || []);
          }
        }

        if (movies.length > 0) {
          // 3. Fetch detailed post-watch ratings for these specific movies
          const movieIds = movies.map(m => m.id);
          const { data: ratingsData, error: ratingsError } = await supabase
            .from("detailed_ratings")
            .select("*")
            .in("watched_movie_id", movieIds);

          if (ratingsError) {
            console.error("Error fetching detailed ratings:", ratingsError);
          } else if (mounted) {
            setDetailedRatings(ratingsData || []);
          }
        }
      } catch (err) {
        console.error("Failed to load stats data", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();
    return () => { mounted = false; };
  }, [sessionId]);

  return { watchedMovies, detailedRatings, proposals, proposalRatings, people, loading };
};
