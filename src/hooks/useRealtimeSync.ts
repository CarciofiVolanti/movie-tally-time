import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Person, MovieRating } from "@/types/session";

interface UseRealtimeSyncConfig {
  sessionId: string | null;
  setMovieRatings: Dispatch<SetStateAction<MovieRating[]>>;
  setPeople: Dispatch<SetStateAction<Person[]>>;
  peopleRef: MutableRefObject<Person[]>;
}

export const useRealtimeSync = ({
  sessionId,
  setMovieRatings,
  setPeople,
  peopleRef,
}: UseRealtimeSyncConfig) => {
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)

      .on('postgres_changes', { event: '*', schema: 'public', table: 'movie_ratings' }, (payload) => {
        const data = payload.new || payload.old;
        if (!data) return;
        const proposalId = data.proposal_id;
        setMovieRatings(currentRatings => {
          if (!currentRatings.some(m => m.proposalId === proposalId)) return currentRatings;
          return currentRatings.map(movie => {
            if (movie.proposalId !== proposalId) return movie;
            const newRatings = { ...movie.ratings };
            if (payload.eventType === 'DELETE') {
              const personId = payload.old.person_id;
              if (personId) delete newRatings[personId];
            } else {
              const { person_id, rating } = payload.new;
              newRatings[person_id] = rating;
            }
            return { ...movie, ratings: newRatings };
          });
        });
      })

      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_people' }, (payload) => {
        const data = payload.new || payload.old;
        if (!data) return;
        if (data.session_id && data.session_id !== sessionId) return;

        if (payload.eventType === 'INSERT') {
          setPeople(prev => {
            if (prev.some(p => p.id === data.id)) return prev;
            return [...prev, { id: data.id, name: data.name, movies: [], isPresent: data.is_present }];
          });
        } else if (payload.eventType === 'UPDATE') {
          setPeople(prev => prev.map(p =>
            p.id === data.id ? { ...p, name: data.name, isPresent: data.is_present } : p
          ));
        } else if (payload.eventType === 'DELETE') {
          setPeople(prev => prev.filter(p => p.id !== data.id));
          setMovieRatings(prev => prev.filter(m => m.proposerId !== data.id));
        }
      })

      .on('postgres_changes', { event: '*', schema: 'public', table: 'movie_proposals' }, (payload) => {
        const data = payload.new || payload.old;
        if (!data) return;
        if (data.session_id && data.session_id !== sessionId) return;

        if (payload.eventType === 'INSERT') {
          setMovieRatings(prev => {
            if (prev.some(m => m.proposalId === data.id)) return prev;
            const proposer = peopleRef.current.find(p => p.id === data.person_id);
            return [...prev, {
              movieTitle: data.movie_title,
              proposedBy: proposer?.name || 'Unknown',
              ratings: {},
              proposalId: data.id,
              proposerId: data.person_id,
              createdAt: data.created_at,
              details: data.poster ? {
                poster: data.poster, genre: data.genre, runtime: data.runtime,
                year: data.year, director: data.director, plot: data.plot,
                imdbRating: data.imdb_rating, imdbId: data.imdb_id,
              } : undefined,
            }];
          });
          setPeople(prev => prev.map(p =>
            p.id === data.person_id
              ? { ...p, movies: Array.from(new Set([...p.movies, data.movie_title])) }
              : p
          ));
        } else if (payload.eventType === 'UPDATE') {
          setMovieRatings(prev => prev.map(m =>
            m.proposalId === data.id
              ? {
                  ...m,
                  movieTitle: data.movie_title,
                  createdAt: data.created_at ?? m.createdAt,
                  details: data.poster ? {
                    poster: data.poster, genre: data.genre, runtime: data.runtime,
                    year: data.year, director: data.director, plot: data.plot,
                    imdbRating: data.imdb_rating, imdbId: data.imdb_id,
                  } : m.details,
                }
              : m
          ));
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          setMovieRatings(prev => {
            const movieToDelete = prev.find(m => m.proposalId === deletedId);
            if (movieToDelete) {
              const title = movieToDelete.movieTitle;
              setPeople(peoplePrev => peoplePrev.map(p => ({
                ...p,
                movies: p.movies.filter(m => m !== title),
              })));
            }
            return prev.filter(m => m.proposalId !== deletedId);
          });
        }
      })

      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);
};
