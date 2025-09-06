import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSelectedPersonForSession, setSelectedPersonForSession } from "@/lib/sessionCookies";
import { Person, MovieRating, MovieDetails, MovieWithStats } from "@/types/session";

// Hook responsibilities:
// - Owns sessionId, people, movieRatings, selectedPersonId, loading, fetchingDetails, collapsedMovies
// - Implements: loadExistingSession, createNewSession, loadSessionData,
//   addPerson, updatePerson, deletePerson, updateRating, fetchAllMovieDetails,
//   searchMovieAgain, markMovieAsWatched, fetchMovieDetails, saveMovieDetailsToDatabase
// - Exposes computed values: presentPeople, rankedMovies, getSortedMovies()
export const useMovieSession = (opts?: { onSessionLoad?: (id: string) => void }) => {
  const { toast } = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [movieRatings, setMovieRatings] = useState<MovieRating[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewSession, setShowNewSession] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [collapsedMovies, setCollapsedMovies] = useState<Record<string, boolean>>({});
  const [selectedPersonId, setSelectedPersonIdState] = useState<string>("");
  const [currentView, setCurrentView] = useState<'session' | 'watched'>('session');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get('session');
    if (sessionIdFromUrl) {
      loadExistingSession(sessionIdFromUrl);
    } else {
      setShowNewSession(true);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist selected person per-session
  useEffect(() => {
    if (sessionId) {
      const saved = getSelectedPersonForSession(sessionId);
      if (saved && people.some(p => p.id === saved)) {
        setSelectedPersonIdState(saved);
      }
    }
  }, [sessionId, people]);

  const setSelectedPersonId = (id: string) => {
    setSelectedPersonIdState(id);
    if (sessionId) setSelectedPersonForSession(sessionId, id);
  };

  const loadExistingSession = async (id: string) => {
    try {
      const { data: session, error } = await supabase.from('movie_sessions').select().eq('id', id).maybeSingle();
      if (error) throw error;
      if (session) {
        setSessionId(session.id);
        opts?.onSessionLoad?.(session.id);
        await loadSessionData(session.id);
      } else {
        setShowNewSession(true);
      }
    } catch (err) {
      console.error('Error loading session:', err);
      setShowNewSession(true);
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async (name: string) => {
    if (!name.trim()) return;
    try {
      setLoading(true);
      const { data: session, error } = await supabase.from('movie_sessions').insert([{ name: name.trim() }]).select().single();
      if (error) throw error;
      setSessionId(session.id);
      opts?.onSessionLoad?.(session.id);
      setShowNewSession(false);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('session', session.id);
      window.history.pushState({}, '', newUrl);
      await loadSessionData(session.id);
    } catch (err) {
      console.error('Error creating session:', err);
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSessionData = async (sid: string) => {
    try {
      const { data: peopleData, error: peopleError } = await supabase.from('session_people').select('*').eq('session_id', sid);
      if (peopleError) throw peopleError;

      const { data: proposalsData, error: proposalsError } = await supabase.from('movie_proposals').select('*').eq('session_id', sid);
      if (proposalsError) throw proposalsError;

      const proposalIds = (proposalsData || []).map((p: any) => p.id) ?? [];
      let ratingsData: any[] = [];
      if (proposalIds.length > 0) {
        const { data: ratings, error: ratingsError } = await supabase.from('movie_ratings').select('*').in('proposal_id', proposalIds);
        if (ratingsError) throw ratingsError;
        ratingsData = ratings ?? [];
      }

      const transformedPeople: Person[] = (peopleData || []).map((person: any) => ({
        id: person.id,
        name: person.name,
        isPresent: person.is_present,
        movies: (proposalsData || []).filter((p: any) => p.person_id === person.id).map((p: any) => p.movie_title)
      }));

      const transformedRatings: MovieRating[] = (proposalsData || []).map((proposal: any) => {
        const proposer = (peopleData || []).find((p: any) => p.id === proposal.person_id);
        const ratings: Record<string, number> = {};
        (ratingsData || []).filter(r => r.proposal_id === proposal.id).forEach(r => {
          ratings[r.person_id] = r.rating;
        });

        const details: MovieDetails | undefined = (proposal.poster || proposal.genre || proposal.runtime) ? {
          poster: proposal.poster,
          genre: proposal.genre,
          runtime: proposal.runtime,
          year: proposal.year,
          director: proposal.director,
          plot: proposal.plot,
          imdbRating: proposal.imdb_rating,
          imdbId: proposal.imdb_id
        } : undefined;

        return {
          movieTitle: proposal.movie_title,
          proposedBy: proposer?.name || 'Unknown',
          ratings,
          details
        };
      });

      setPeople(transformedPeople);
      setMovieRatings(transformedRatings);
    } catch (err) {
      console.error('Error loading session data:', err);
    }
  };

  const fetchMovieDetails = async (movieTitle: string): Promise<MovieDetails | undefined> => {
    try {
      const { data, error } = await supabase.functions.invoke('search-movie', { body: { title: movieTitle } });
      if (error) {
        console.error('Error fetching movie details:', error);
        return undefined;
      }
      return {
        poster: data.poster,
        genre: data.genre,
        runtime: data.runtime,
        year: data.year,
        director: data.director,
        plot: data.plot,
        imdbRating: data.imdbRating,
        imdbId: data.imdbId
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
        poster: details.poster,
        genre: details.genre,
        runtime: details.runtime,
        year: details.year,
        director: details.director,
        plot: details.plot,
        imdb_rating: String(details.imdbRating), // Ensure it's a string i DONT KNOW WHY
        imdb_id: details.imdbId
      }).eq('session_id', sessionId).eq('movie_title', movieTitle);
    } catch (err) {
      console.error('Error saving movie details to database:', err);
    }
  };

  const fetchAllMovieDetails = async () => {
    if (movieRatings.length === 0) return;
    setFetchingDetails(true);
    try {
      const updated = await Promise.all(movieRatings.map(async (movie) => {
        if (movie.details && movie.details.poster && movie.details.poster !== 'N/A') return movie;
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

  const addPerson = async (name: string) => {
    if (!name.trim() || !sessionId) return;
    try {
      const { data: person, error } = await supabase.from('session_people').insert([{ session_id: sessionId, name: name.trim(), is_present: true }]).select().single();
      if (error) throw error;
      const newPerson: Person = { id: person.id, name: person.name, movies: [], isPresent: person.is_present };
      setPeople(prev => [...prev, newPerson]);
    } catch (err) {
      console.error('Error adding person:', err);
      toast({ title: "Error", description: "Failed to add person. Please try again.", variant: "destructive" });
    }
  };

  const updatePerson = async (updatedPerson: Person) => {
    if (!sessionId) return;
    try {
      setPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
      await supabase.from('session_people').update({ is_present: updatedPerson.isPresent }).eq('id', updatedPerson.id);

      const { data: currentProposals } = await supabase.from('movie_proposals').select('movie_title, id').eq('person_id', updatedPerson.id);
      const currentMovies = currentProposals?.map((p: any) => p.movie_title) || [];

      const moviesToAdd = updatedPerson.movies.filter(m => !currentMovies.includes(m));
      const moviesToRemove = currentMovies.filter(m => !updatedPerson.movies.includes(m));

      if (moviesToRemove.length > 0) {
        await supabase.from('movie_proposals').delete().eq('person_id', updatedPerson.id).in('movie_title', moviesToRemove);
        setMovieRatings(prev => prev.filter(movie => !moviesToRemove.includes(movie.movieTitle)));
      }

      if (moviesToAdd.length > 0) {
        const newMovieRatings = moviesToAdd.map(movieTitle => ({ movieTitle, proposedBy: updatedPerson.name, ratings: {} }));
        setMovieRatings(prev => [...prev, ...newMovieRatings]);

        moviesToAdd.forEach(async (movieTitle) => {
          try {
            const { data, error } = await supabase.functions.invoke('propose-movie-with-details', {
              body: { sessionId, personId: updatedPerson.id, movieTitle }
            });
            if (error) {
              console.error('Edge function error for', movieTitle, error);
              return;
            }
            const returnedProposal = data?.proposal;
            const existingId = data?.proposalId;
            if (returnedProposal) {
              const details = {
                poster: returnedProposal.poster,
                genre: returnedProposal.genre,
                runtime: returnedProposal.runtime,
                year: returnedProposal.year,
                director: returnedProposal.director,
                plot: returnedProposal.plot,
                imdbRating: returnedProposal.imdb_rating,
                imdbId: returnedProposal.imdb_id
              };
              setMovieRatings(prev => prev.map(m => m.movieTitle === movieTitle ? { ...m, details } : m));
            } else if (existingId) {
              const { data: found, error: findErr } = await supabase.from('movie_proposals').select('*').eq('id', existingId).maybeSingle();
              if (!findErr && found) {
                const details = {
                  poster: found.poster,
                  genre: found.genre,
                  runtime: found.runtime,
                  year: found.year,
                  director: found.director,
                  plot: found.plot,
                  imdbRating: found.imdb_rating,
                  imdbId: found.imdb_id
                };
                setMovieRatings(prev => prev.map(m => m.movieTitle === movieTitle ? { ...m, details } : m));
              }
            }
          } catch (err) {
            console.error('Failed to propose movie with details for', movieTitle, err);
          }
        });
      }
    } catch (err) {
      console.error('Error updating person:', err);
      await loadSessionData(sessionId!);
      toast({ title: "Error", description: "Failed to update person. Please try again.", variant: "destructive" });
    }
  };

  const deletePerson = async (id: string) => {
    const person = people.find(p => p.id === id);
    if (!person) return;
    if (!window.confirm(`Are you sure you want to remove ${person.name}? This cannot be undone.`)) return;
    try {
      await supabase.from('session_people').delete().eq('id', id);
      setPeople(prev => prev.filter(p => p.id !== id));
      await loadSessionData(sessionId!);
    } catch (err) {
      console.error('Error deleting person:', err);
      toast({ title: "Error", description: "Failed to remove person. Please try again.", variant: "destructive" });
    }
  };

  const updateRating = async (movieTitle: string, personId: string, rating: number) => {
    try {
      const { data: proposals } = await supabase.from('movie_proposals').select('id').eq('movie_title', movieTitle).eq('session_id', sessionId);
      if (!proposals || proposals.length === 0) return;
      const proposalId = proposals[0].id;
      if (rating === 0) {
        await supabase.from('movie_ratings').delete().eq('proposal_id', proposalId).eq('person_id', personId);
        setMovieRatings(prev => prev.map(movie => {
          if (movie.movieTitle === movieTitle) {
            const newRatings = { ...movie.ratings };
            delete newRatings[personId];
            return { ...movie, ratings: newRatings };
          }
          return movie;
        }));
      } else {
        await supabase.from("movie_ratings").upsert({
          proposal_id: proposalId,
          person_id: personId,
          rating,
        }, { onConflict: "proposal_id,person_id" });

        setMovieRatings(prev => prev.map(movie => movie.movieTitle === movieTitle ? {
          ...movie,
          ratings: { ...movie.ratings, [personId]: rating }
        } : movie));
      }
    } catch (err) {
      console.error('Error updating rating:', err);
      toast({ title: "Error", description: "Failed to save rating. Please try again.", variant: "destructive" });
    }
  };

  const markMovieAsWatched = async (movieTitle: string) => {
    if (!sessionId) return;
    if (!window.confirm(`Are you sure you want to mark "${movieTitle}" as watched? This will move it to the watched movies section.`)) return;
    try {
      const { data: proposal, error: proposalError } = await supabase.from('movie_proposals').select('*').eq('session_id', sessionId).eq('movie_title', movieTitle).single();
      if (proposalError) throw proposalError;
      if (!proposal) return;

      const { data: proposer } = await supabase.from('session_people').select('name').eq('id', proposal.person_id).single();
      const { data: insertedWatched, error: insertError } = await supabase.from('watched_movies').insert({
        session_id: sessionId,
        movie_title: movieTitle,
        proposed_by: proposer?.name || 'Unknown',
        poster: proposal.poster,
        genre: proposal.genre,
        runtime: proposal.runtime,
        year: proposal.year,
        director: proposal.director,
        plot: proposal.plot,
        imdb_rating: proposal.imdb_rating,
        imdb_id: proposal.imdb_id,
        watched_at: new Date().toISOString()
      }).select('id').single();

      if (insertError) throw insertError;
      const watchedId = insertedWatched.id;

      await supabase.from('movie_ratings').update({ watched_movie_id: watchedId }).eq('proposal_id', proposal.id);
      await supabase.from('movie_proposals').delete().eq('id', proposal.id);

      setMovieRatings(prev => prev.filter(movie => movie.movieTitle !== movieTitle));
      setPeople(prev => prev.map(person => ({ ...person, movies: person.movies.filter(m => m !== movieTitle) })));

      toast({ title: "Movie marked as watched", description: `"${movieTitle}" has been moved to watched movies section` });
    } catch (err) {
      console.error('Error marking movie as watched:', err);
      toast({ title: "Error", description: "Failed to mark movie as watched", variant: "destructive" });
    }
  };

  const toggleCollapse = (movieTitle: string) => {
    setTimeout(() => {
      setCollapsedMovies(prev => ({ ...prev, [movieTitle]: !prev[movieTitle] }));
    }, 0);
  };

  const getSortedMovies = () => {
    if (!selectedPersonId) return movieRatings;
    return [...movieRatings].sort((a, b) => {
      const aRated = a.ratings[selectedPersonId] !== undefined && a.ratings[selectedPersonId] > 0;
      const bRated = b.ratings[selectedPersonId] !== undefined && b.ratings[selectedPersonId] > 0;
      if (!aRated && bRated) return -1;
      if (aRated && !bRated) return 1;
      return 0;
    });
  };

  const presentPeople = people.filter(p => p.isPresent);

  const rankedMovies: MovieWithStats[] = movieRatings.map(movie => {
    const validRatings = presentPeople.map(p => movie.ratings[p.id]).filter(r => typeof r === "number" && r > 0);
    const averageRating = validRatings.length > 0 ? validRatings.reduce((s, r) => s + r, 0) / validRatings.length : 0;
    return { ...movie, averageRating, totalRatings: validRatings.length };
  }).filter(movie => presentPeople.some(p => p.movies.includes(movie.movieTitle))).sort((a, b) => b.averageRating - a.averageRating);

  return {
    // state
    people,
    movieRatings,
    sessionId,
    loading,
    showNewSession,
    fetchingDetails,
    collapsedMovies,
    selectedPersonId,
    currentView,
    // computed/actions
    presentPeople,
    rankedMovies,
    getSortedMovies,
    // setters that may be used by root
    setShowNewSession,
    setSessionId,
    setCurrentView,
    setSelectedPersonId,
    setCollapsedMovies,
    // methods
    loadExistingSession,
    createNewSession,
    loadSessionData,
    fetchAllMovieDetails,
    searchMovieAgain,
    addPerson,
    updatePerson,
    deletePerson,
    updateRating,
    markMovieAsWatched,
    toggleCollapse,
  };
};

export default useMovieSession;
