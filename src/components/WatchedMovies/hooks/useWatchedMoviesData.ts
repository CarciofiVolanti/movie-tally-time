import { useState, useEffect, useCallback, useRef } from "react";
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
    loadData();
  }, [loadData]);

  // Keep a ref so subscription callbacks always call the latest loadData
  // without needing to re-subscribe when loadData identity changes
  const loadDataRef = useRef(loadData);
  useEffect(() => { loadDataRef.current = loadData; }, [loadData]);

  // Track current watched movie IDs for filtering detailed_ratings events
  const watchedMovieIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    watchedMovieIdsRef.current = new Set(watchedMovies.map(m => m.id));
  }, [watchedMovies]);

  // Realtime subscriptions
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`watched-movies-${sessionId}`)

      // ── watched_movies: movie added or removed ───────────────────────────────
      // Reload the full list — these events are infrequent and the full movie
      // object (title, poster, metadata) isn't worth reconstructing from the payload
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watched_movies', filter: `session_id=eq.${sessionId}` }, () => {
        loadDataRef.current();
      })

      // ── detailed_ratings: granular rating updates ────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detailed_ratings' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          // payload.old only contains the PK — remove by id regardless of movie
          setDetailedRatings(prev => prev.filter(r => r.id !== payload.old.id));
        } else {
          const rating = payload.new as DetailedRating;
          // Ignore ratings that belong to a different session's movies
          if (!watchedMovieIdsRef.current.has(rating.watched_movie_id)) return;
          setDetailedRatings(prev => {
            const idx = prev.findIndex(r => r.id === rating.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = rating;
              return updated;
            }
            return [...prev, rating];
          });
        }
      })

      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

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
