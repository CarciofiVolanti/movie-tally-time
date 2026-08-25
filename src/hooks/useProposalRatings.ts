import { useMemo, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Person, MovieRating, MovieDetails, MovieWithStats } from "@/types/session";
import { normalizeTitle } from "@/lib/utils";
import { sortRatings } from "@/lib/sessionHelpers";
import type { useToast } from "@/hooks/use-toast";

type Toast = ReturnType<typeof useToast>['toast'];

interface UseProposalRatingsConfig {
  sessionId: string | null;
  people: Person[];
  setPeople: Dispatch<SetStateAction<Person[]>>;
  movieRatings: MovieRating[];
  setMovieRatings: Dispatch<SetStateAction<MovieRating[]>>;
  shouldSort: boolean;
  setShouldSort: Dispatch<SetStateAction<boolean>>;
  setFetchingDetails: Dispatch<SetStateAction<boolean>>;
  setCollapsedMovies: Dispatch<SetStateAction<Record<string, boolean>>>;
  toast: Toast;
}

export const useProposalRatings = ({
  sessionId,
  people,
  setPeople,
  movieRatings,
  setMovieRatings,
  shouldSort,
  setShouldSort,
  setFetchingDetails,
  setCollapsedMovies,
  toast,
}: UseProposalRatingsConfig) => {

  const presentPeople = useMemo(() => people.filter(p => p.isPresent), [people]);

  const rankedMovies = useMemo<MovieWithStats[]>(() => movieRatings.map(movie => {
    const validRatings = presentPeople
      .map(p => movie.ratings[p.id])
      .filter(r => typeof r === "number" && r > 0);
    const averageRating = validRatings.length > 0
      ? validRatings.reduce((s, r) => s + r, 0) / validRatings.length
      : 0;
    return { ...movie, averageRating, totalRatings: validRatings.length };
  }).filter(movie => {
    const proposerId = movie.proposerId;
    if (!proposerId || !presentPeople.some(p => p.id === proposerId)) return false;
    // Require at least one vote from a present non-proposer so a lone default-5
    // from the proposer doesn't inflate the ranking before anyone else has weighed in
    return presentPeople.some(p =>
      p.id !== proposerId && typeof movie.ratings[p.id] === "number" && movie.ratings[p.id] > 0
    );
  }).sort((a, b) => {
    if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
    return normalizeTitle(a.movieTitle).localeCompare(normalizeTitle(b.movieTitle));
  }), [movieRatings, presentPeople]);

  const toggleCollapse = (movieTitle: string) => {
    setCollapsedMovies(prev => ({ ...prev, [movieTitle]: !(prev[movieTitle] ?? true) }));
  };

  const fetchMovieDetails = async (movieTitle: string): Promise<MovieDetails | undefined> => {
    try {
      const { data, error } = await supabase.functions.invoke('search-movie', { body: { title: movieTitle } });
      if (error) { console.error('Error fetching movie details:', error); return undefined; }
      return {
        poster: data.poster, genre: data.genre, runtime: data.runtime, year: data.year,
        director: data.director, plot: data.plot,
        imdbRating: data.imdbRating, imdbId: data.imdbId,
      };
    } catch (err) {
      console.error('Error fetching movie details:', err);
      return undefined;
    }
  };

  const saveMovieDetailsToDatabase = async (movieTitle: string, details: MovieDetails) => {
    if (!sessionId) return;
    try {
      await supabase.from('movie_proposals').update({
        poster: details.poster, genre: details.genre, runtime: details.runtime,
        year: details.year, director: details.director, plot: details.plot,
        imdb_rating: details.imdbRating, imdb_id: details.imdbId,
      }).eq('session_id', sessionId).eq('movie_title', movieTitle);
    } catch (err) {
      console.error('Error saving movie details to database:', err);
    }
  };

  const updateRating = async (proposalId: string, personId: string, rating: number) => {
    try {
      if (rating === 0) {
        await supabase.from('movie_ratings').delete()
          .eq('proposal_id', proposalId).eq('person_id', personId);
        setMovieRatings(prev => prev.map(movie => {
          if (movie.proposalId === proposalId) {
            const newRatings = { ...movie.ratings };
            delete newRatings[personId];
            return { ...movie, ratings: newRatings };
          }
          return movie;
        }));
      } else {
        await supabase.from("movie_ratings").upsert(
          { proposal_id: proposalId, person_id: personId, rating },
          { onConflict: "proposal_id,person_id" }
        );
        setMovieRatings(prev => prev.map(movie =>
          movie.proposalId === proposalId
            ? { ...movie, ratings: { ...movie.ratings, [personId]: rating } }
            : movie
        ));
      }
      setShouldSort(false);
    } catch (err) {
      console.error('Error updating rating:', err);
      toast({ title: "Error", description: "Failed to save rating. Please try again.", variant: "destructive" });
    }
  };

  const markMovieAsWatched = async (movieTitle: string) => {
    if (!sessionId) return;
    try {
      const { data: proposal, error: proposalError } = await supabase
        .from('movie_proposals').select('*')
        .eq('session_id', sessionId).eq('movie_title', movieTitle).single();
      if (proposalError) throw proposalError;
      if (!proposal) return;

      const { data: proposer } = await supabase
        .from('session_people').select('name').eq('id', proposal.person_id).single();
      const { data: insertedWatched, error: insertError } = await supabase
        .from('watched_movies').insert({
          session_id: sessionId,
          movie_title: movieTitle,
          proposed_by: proposer?.name || 'Unknown',
          poster: proposal.poster, genre: proposal.genre, runtime: proposal.runtime,
          year: proposal.year, director: proposal.director, plot: proposal.plot,
          imdb_rating: proposal.imdb_rating, imdb_id: proposal.imdb_id,
          watched_at: new Date().toISOString(),
        }).select('id').single();
      if (insertError) throw insertError;

      const watchedId = insertedWatched.id;
      await supabase.from('movie_ratings').update({ watched_movie_id: watchedId }).eq('proposal_id', proposal.id);
      await supabase.from('proposal_comments').delete().eq('proposal_id', proposal.id);
      await supabase.from('movie_proposals').delete().eq('id', proposal.id);

      setMovieRatings(prev => prev.filter(movie => movie.movieTitle !== movieTitle));
      setPeople(prev => prev.map(person => ({
        ...person,
        movies: person.movies.filter(m => m !== movieTitle),
      })));
      toast({ title: "Movie marked as watched", description: `"${movieTitle}" has been moved to watched movies section` });
    } catch (err) {
      console.error('Error marking movie as watched:', err);
      toast({ title: "Error", description: "Failed to mark movie as watched", variant: "destructive" });
    }
  };

  const fetchAllMovieDetails = async () => {
    if (movieRatings.length === 0) return;
    setFetchingDetails(true);
    try {
      const updated = await Promise.all(movieRatings.map(async (movie) => {
        if (movie.details?.poster && movie.details.poster !== 'N/A') return movie;
        const details = await fetchMovieDetails(movie.movieTitle);
        if (details) await saveMovieDetailsToDatabase(movie.movieTitle, details);
        return { ...movie, details };
      }));
      setMovieRatings(updated);
      toast({ title: "Success", description: "Movie details updated successfully!" });
    } catch (err) {
      console.error('Error fetching movie details:', err);
      toast({ title: "Error", description: "Failed to fetch some movie details.", variant: "destructive" });
    } finally {
      setFetchingDetails(false);
    }
  };

  const searchMovieAgain = async (movieTitle: string) => {
    setFetchingDetails(true);
    try {
      const details = await fetchMovieDetails(movieTitle);
      if (details) {
        await saveMovieDetailsToDatabase(movieTitle, details);
        setMovieRatings(prev => prev.map(m => m.movieTitle === movieTitle ? { ...m, details } : m));
        toast({ title: "Success", description: `Updated details for "${movieTitle}"` });
      } else {
        toast({ title: "Not Found", description: `Could not find details for "${movieTitle}"`, variant: "destructive" });
      }
    } catch (err) {
      console.error('Error searching movie again:', err);
      toast({ title: "Error", description: "Failed to search for movie details", variant: "destructive" });
    } finally {
      setFetchingDetails(false);
    }
  };

  const updateComment = async (proposalId: string, authorId: string, comment: string) => {
    try {
      const trimmed = comment.trim();
      const { error } = await supabase.from('proposal_comments').upsert(
        { proposal_id: proposalId, author: authorId, comment: trimmed || null },
        { onConflict: 'proposal_id' }
      );
      if (error) throw error;
      setMovieRatings(prev => prev.map(movie =>
        movie.proposalId === proposalId
          ? { ...movie, comment: trimmed || undefined }
          : movie
      ));
    } catch (err) {
      console.error('Error updating comment:', err);
      toast({ title: "Error", description: "Failed to save comment. Please try again.", variant: "destructive" });
      throw err;
    }
  };

  return {
    presentPeople,
    rankedMovies,
    toggleCollapse,
    updateRating,
    updateComment,
    markMovieAsWatched,
    fetchAllMovieDetails,
    searchMovieAgain,
  };
};
