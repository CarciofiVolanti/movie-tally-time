import { useEffect, useState, useCallback } from "react";
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
  // control whether getSortedMovies should re-order the list
  const [shouldSort, setShouldSort] = useState<boolean>(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get('session');
    
    if (sessionIdFromUrl) {
      loadExistingSession(sessionIdFromUrl);
    } else {
      setShowNewSession(true);
      setLoading(false);
    }
  }, []); // Keep empty deps - only run on mount

  // validate selected person exists in people list (after people are loaded)
  useEffect(() => {
    if (sessionId && selectedPersonId && people.length > 0) {
      // if selected person doesn't exist in people list, reset it
      if (!people.some(p => p.id === selectedPersonId)) {
        setSelectedPersonIdState("");
      }
    }
  }, [sessionId, selectedPersonId, people]);

  const setSelectedPersonId = (id: string) => {
    // selecting a different person should allow sorting logic to run
    setShouldSort(true);
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
        
        // Load selected person BEFORE loading session data so initial sort works correctly
        const savedPersonId = getSelectedPersonForSession(session.id);
        console.log("Saved person ID from cookies:", savedPersonId);
        if (savedPersonId) {
          setSelectedPersonIdState(savedPersonId);
          console.log("Set selectedPersonId to:", savedPersonId);
        }
        
        await loadSessionData(session.id, savedPersonId || "");
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
      const { data: session, error } = await supabase
        .from('movie_sessions')
        .insert([{ name: name.trim() }])
        .select()
        .single();
        
      if (error) throw error;
      
      setSessionId(session.id);
      opts?.onSessionLoad?.(session.id);
      setShowNewSession(false);
      
      // Cleaner URL update - preserve other params if any
      const url = new URL(window.location.href);
      url.searchParams.set('session', session.id);
      window.history.replaceState({}, '', url); // Use replaceState for same-page navigation
      
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

  // Split into focused, reusable functions
  const loadSessionData = async (sid: string, savedPersonId?: string) => {
    try {
      // Parallel fetch for better performance
      const [peopleData, proposalsWithDetails] = await Promise.all([
        fetchSessionPeople(sid),
        fetchProposalsWithRatingsAndComments(sid)
      ]);

      const transformedPeople = transformPeopleData(peopleData, proposalsWithDetails.proposals);
      const transformedRatings = transformRatingsData(proposalsWithDetails, peopleData);

      setPeople(transformedPeople);
      
      // Initial sort based on selected person (if any)
      const sorted = sortMovieRatings(transformedRatings, savedPersonId || selectedPersonId);
      setMovieRatings(sorted);
      setShouldSort(true);
    } catch (err) {
      console.error('Error loading session data:', err);
      toast({
        title: "Error",
        description: "Failed to load session data",
        variant: "destructive"
      });
    }
  };

  // Separate data fetching logic
  const fetchSessionPeople = async (sid: string) => {
    const { data, error } = await supabase
      .from('session_people')
      .select('*')
      .eq('session_id', sid);
    
    if (error) throw error;
    return data || [];
  };

  const fetchProposalsWithRatingsAndComments = async (sid: string) => {
    const { data: proposals, error: proposalsError } = await supabase
      .from('movie_proposals')
      .select(`
        *,
        movie_ratings(*),
        proposal_comments(*)
      `)
      .eq('session_id', sid);

    if (proposalsError) throw proposalsError;
    return {
      proposals: proposals || [],
      // Data is already joined, no need for separate queries
    };
  };

  // Pure transformation functions - easier to test & reason about
  const transformPeopleData = (peopleData: any[], proposals: any[]): Person[] => {
    return peopleData.map(person => ({
      id: person.id,
      name: person.name,
      isPresent: person.is_present,
      movies: proposals
        .filter(p => p.person_id === person.id)
        .map(p => p.movie_title)
    }));
  };

  const transformRatingsData = (proposalsData: { proposals: any[] }, peopleData: any[]): MovieRating[] => {
    return proposalsData.proposals.map(proposal => {
      const proposer = peopleData.find(p => p.id === proposal.person_id);
      
      // Transform ratings array to object
      const ratings: Record<string, number> = {};
      (proposal.movie_ratings || []).forEach((r: any) => {
        ratings[r.person_id] = r.rating;
      });

      // Extract comment (first one if multiple exist)
      const commentRow = proposal.proposal_comments?.[0];

      const details: MovieDetails | undefined = proposal.poster ? {
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
        details,
        comment: commentRow?.comment,
        proposalId: proposal.id, // Add here to avoid separate useEffect
        proposerId: proposal.person_id
      };
    });
  };

  const sortMovieRatings = (ratings: MovieRating[], personId: string): MovieRating[] => {
    if (!personId) {
      return [...ratings].sort((a, b) => a.movieTitle.localeCompare(b.movieTitle));
    }

    return [...ratings].sort((a, b) => {
      const aRated = a.ratings[personId] !== undefined && a.ratings[personId] > 0;
      const bRated = b.ratings[personId] !== undefined && b.ratings[personId] > 0;
      
      if (aRated !== bRated) return aRated ? 1 : -1;
      return a.movieTitle.localeCompare(b.movieTitle);
    });
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
      const { data: person, error } = await supabase
        .from('session_people')
        .insert([{ 
          session_id: sessionId, 
          name: name.trim(), 
          is_present: true 
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setPeople(prev => [...prev, {
        id: person.id,
        name: person.name,
        movies: [],
        isPresent: person.is_present
      }]);
    } catch (err) {
      console.error('Error adding person:', err);
      toast({
        title: "Error",
        description: "Failed to add person. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updatePerson = async (updatedPerson: Person) => {
    if (!sessionId) return;
    
    try {
      // Optimistic update
      setPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
      
      // Update presence status
      const { error } = await supabase
        .from('session_people')
        .update({ is_present: updatedPerson.isPresent })
        .eq('id', updatedPerson.id);
        
      if (error) throw error;
      
      // Handle movie proposals separately
      await updatePersonMovies(updatedPerson);
      
    } catch (err) {
      console.error('Error updating person:', err);
      // Rollback optimistic update
      setPeople(prev => prev.map(p => 
        p.id === updatedPerson.id 
          ? people.find(original => original.id === updatedPerson.id) || p
          : p
      ));
      toast({
        title: "Error",
        description: "Failed to update person. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updatePersonMovies = async (person: Person) => {
    if (!sessionId) return;
    
    // Get current proposals for this person
    const { data: currentProposals } = await supabase
      .from('movie_proposals')
      .select('movie_title, id')
      .eq('person_id', person.id);
      
    const currentMovies = currentProposals?.map(p => p.movie_title) || [];
    const moviesToAdd = person.movies.filter(m => !currentMovies.includes(m));
    const moviesToRemove = currentMovies.filter(m => !person.movies.includes(m));

    // Remove proposals
    if (moviesToRemove.length > 0) {
      const proposalIds = currentProposals!
        .filter(p => moviesToRemove.includes(p.movie_title))
        .map(p => p.id);

      await supabase.from('movie_proposals').delete().in('id', proposalIds);
      setMovieRatings(prev => prev.filter(m => !moviesToRemove.includes(m.movieTitle)));
    }

    // Add new proposals
    if (moviesToAdd.length > 0) {
      // Optimistic UI update
      const optimisticMovies = moviesToAdd.map(movieTitle => ({
        movieTitle,
        proposedBy: person.name,
        ratings: {},
        proposerId: person.id
      }));
      setMovieRatings(prev => [...prev, ...optimisticMovies]);

      // Fetch details in background using edge function
      // Process sequentially to avoid rate limits and race conditions
      for (const movieTitle of moviesToAdd) {
        try {
          const { data, error } = await supabase.functions.invoke('propose-movie-with-details', {
            body: { sessionId, personId: person.id, movieTitle }
          });

          if (error) {
            console.error(`Edge function error for "${movieTitle}":`, error);
            continue;
          }

          const proposal = data?.proposal;
          const existingId = data?.proposalId;

          // Update with fetched details
          if (proposal || existingId) {
            const details = proposal ? {
              poster: proposal.poster,
              genre: proposal.genre,
              runtime: proposal.runtime,
              year: proposal.year,
              director: proposal.director,
              plot: proposal.plot,
              imdbRating: proposal.imdb_rating,
              imdbId: proposal.imdb_id
            } : await fetchExistingProposalDetails(existingId);

            setMovieRatings(prev => prev.map(m => 
              m.movieTitle === movieTitle 
                ? { 
                    ...m, 
                    details,
                    proposalId: proposal?.id || existingId,
                    proposerId: person.id
                  }
                : m
            ));
          }
        } catch (err) {
          console.error(`Failed to fetch details for "${movieTitle}":`, err);
          // Movie still appears, just without details
        }
      }
    }
  };

  const fetchExistingProposalDetails = async (proposalId: string): Promise<MovieDetails | undefined> => {
    const { data, error } = await supabase
      .from('movie_proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (error || !data) return undefined;

    return {
      poster: data.poster,
      genre: data.genre,
      runtime: data.runtime,
      year: data.year,
      director: data.director,
      plot: data.plot,
      imdbRating: data.imdb_rating,
      imdbId: data.imdb_id
    };
  };

  const deletePerson = async (id: string) => {
    const person = people.find(p => p.id === id);
    if (!person) return;
    
    if (!window.confirm(`Are you sure you want to remove ${person.name}? This will also remove all their movie proposals and cannot be undone.`)) {
      return;
    }
    
    try {
      // Cascade delete is handled by DB foreign keys
      const { error } = await supabase
        .from('session_people')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Remove from local state
      setPeople(prev => prev.filter(p => p.id !== id));
      setMovieRatings(prev => prev.filter(m => m.proposerId !== id));
      
    } catch (err) {
      console.error('Error deleting person:', err);
      toast({
        title: "Error",
        description: "Failed to remove person. Please try again.",
        variant: "destructive"
      });
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
        // after a rating change we don't want automatic resorting
        setShouldSort(false);
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
        // prevent resorting after this rating change
        setShouldSort(false);
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
      await supabase.from('proposal_comments').delete().eq('proposal_id', proposal.id);
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
    setCollapsedMovies(prev => ({ ...prev, [movieTitle]: !(prev[movieTitle] ?? true) }));
  };

  const getSortedMovies = () => {
    // If sorting has been suppressed (e.g. user just rated a movie), return current order
    if (!shouldSort) return movieRatings;

    if (!selectedPersonId) {
      // No selected person → sort alphabetically
      return [...movieRatings].sort((a, b) => a.movieTitle.localeCompare(b.movieTitle));
    }

    return [...movieRatings].sort((a, b) => {
      const aRated = a.ratings[selectedPersonId] !== undefined && a.ratings[selectedPersonId] > 0;
      const bRated = b.ratings[selectedPersonId] !== undefined && b.ratings[selectedPersonId] > 0;

      // Group: not-voted first, then voted
      if (aRated !== bRated) return aRated ? 1 : -1;

      // Within the same group, sort alphabetically by title
      return a.movieTitle.localeCompare(b.movieTitle);
    });
  };

  const presentPeople = people.filter(p => p.isPresent);

  const rankedMovies: MovieWithStats[] = movieRatings.map(movie => {
    const validRatings = presentPeople.map(p => movie.ratings[p.id]).filter(r => typeof r === "number" && r > 0);
    const averageRating = validRatings.length > 0 ? validRatings.reduce((s, r) => s + r, 0) / validRatings.length : 0;
    return { ...movie, averageRating, totalRatings: validRatings.length };
  }).filter(movie => presentPeople.some(p => p.movies.includes(movie.movieTitle))).sort((a, b) => b.averageRating - a.averageRating);

  // Attach proposalId / proposerId to movieRatings so UI can use stable identifiers
  useEffect(() => {
    let mounted = true;

    // only run when we have movies and some items don't already have proposalId
    const needsAttach = movieRatings.length > 0 && movieRatings.some(m => !((m as any).proposalId || (m as any).proposal_id));
    if (!needsAttach) return;

    (async () => {
      try {
        const titles = Array.from(new Set(movieRatings.map(m => m.movieTitle)));
        if (titles.length === 0) return;

        const { data: proposals, error } = await supabase
          .from("movie_proposals" as any)
          .select("id, movie_title, person_id")
          .in("movie_title", titles);

        if (error) throw error;
        if (!mounted) return;

        const proposalsByTitle: Record<string, any[]> = {};
        (proposals || []).forEach((p: any) => {
          proposalsByTitle[p.movie_title] = proposalsByTitle[p.movie_title] || [];
          proposalsByTitle[p.movie_title].push(p);
        });

        setMovieRatings(prev =>
          prev.map(m => {
            // preserve existing proposalId if present
            const existing = (m as any).proposalId ?? (m as any).proposal_id;
            if (existing) return m;

            const list = proposalsByTitle[m.movieTitle] || [];
            const first = list[0];
            return {
              ...m,
              proposalId: first?.id ?? undefined,
              proposerId: first?.person_id ?? undefined,
            };
          })
        );
      } catch (err) {
        console.error("Failed to attach proposal ids to movieRatings:", err);
      }
    })();

    return () => { mounted = false; };
  }, [movieRatings]);

  // Consolidated Realtime Subscription
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-ratings-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movie_ratings'
        },
        (payload) => {
          const proposalId = payload.new?.proposal_id || payload.old?.proposal_id;
          
          setMovieRatings(currentRatings => {
            // Check if this update is relevant to our current list of movies
            const isRelevant = currentRatings.some(m => (m as any).proposalId === proposalId);
            if (!isRelevant) return currentRatings;

            return currentRatings.map(movie => {
              if ((movie as any).proposalId === proposalId) {
                const newRatings = { ...movie.ratings };
                
                if (payload.eventType === 'DELETE') {
                  const { person_id } = payload.old;
                  delete newRatings[person_id];
                } else {
                  // INSERT or UPDATE
                  const { person_id, rating } = payload.new;
                  newRatings[person_id] = rating;
                }
                
                return { ...movie, ratings: newRatings };
              }
              return movie;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

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
    toggleCollapse
  };
};

export default useMovieSession;
