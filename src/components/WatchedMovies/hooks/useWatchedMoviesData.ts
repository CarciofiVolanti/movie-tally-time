import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { WatchedMovie, DetailedRating, Person, WatchedMoviesData } from "../types";

export const useWatchedMoviesData = (sessionId: string): WatchedMoviesData & { 
  loading: boolean; 
  error: string | null; 
  retry: () => void;
} => {
  const [watchedMovies, setWatchedMovies] = useState<WatchedMovie[]>([]);
  const [detailedRatings, setDetailedRatings] = useState<DetailedRating[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);

      // Load people
      const { data: peopleData, error: peopleError } = await supabase
        .from("session_people")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (peopleError) throw peopleError;
      setPeople(peopleData || []);

      // Load watched movies
      const { data: moviesData, error: moviesError } = await supabase
        .from("watched_movies")
        .select("*")
        .eq("session_id", sessionId)
        .order("watched_at", { ascending: false });

      if (moviesError) throw moviesError;
      setWatchedMovies(moviesData || []);

      // Load detailed ratings only if there are movies
      if (moviesData && moviesData.length > 0) {
        const { data: ratingsData, error: ratingsError } = await supabase
          .from("detailed_ratings")
          .select("*")
          .in("watched_movie_id", moviesData.map(m => m.id));

        if (ratingsError) throw ratingsError;
        setDetailedRatings(ratingsData || []);
      } else {
        setDetailedRatings([]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load watched movies data";
      console.error("Error loading data:", error);
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [sessionId, toast]);

  const retry = useCallback(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let mounted = true;

    const loadDataWithMountCheck = async () => {
      await loadData();
      // Only update state if component is still mounted
      if (!mounted) return;
    };

    loadDataWithMountCheck();

    return () => {
      mounted = false;
    };
  }, [loadData]);

  return {
    watchedMovies,
    detailedRatings,
    people,
    setDetailedRatings,
    loadData,
    loading,
    error,
    retry
  };
};
