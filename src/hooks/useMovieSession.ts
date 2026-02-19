import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSelectedPersonForSession, setSelectedPersonForSession } from "@/lib/sessionCookies";
import { Person, MovieRating, MovieDetails, MovieWithStats } from "@/types/session";
import { transformPeopleData, transformRatingsData, sortMovieRatings } from "@/lib/sessionHelpers";

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

  // Keep a ref to people for use in real-time callbacks without triggering re-subscriptions
  const peopleRef = useRef<Person[]>(people);
  useEffect(() => {
    peopleRef.current = people;
  }, [people]);

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

    const originalPerson = people.find(p => p.id === updatedPerson.id);

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
          ? originalPerson || p
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
      // Optimistic UI update — proposer gets a default rating of 5
      const optimisticMovies = moviesToAdd.map(movieTitle => ({
        movieTitle,
        proposedBy: person.name,
        ratings: { [person.id]: 5 },
        proposerId: person.id
      }));
      setMovieRatings(prev => [...prev, ...optimisticMovies]);

      // Fetch details in background using edge function
      const results = await Promise.allSettled(
        moviesToAdd.map(async (movieTitle) => {
          try {
            const { data, error } = await supabase.functions.invoke('propose-movie-with-details', {
              body: { sessionId, personId: person.id, movieTitle }
            });

            if (error) {
              console.error(`Edge function error for "${movieTitle}":`, error);
              throw new Error(`Edge function failed for "${movieTitle}"`); // Propagate error for Promise.allSettled
            }

            const proposal = data?.proposal;
            const existingId = data?.proposalId;

            let details = undefined;
            if (proposal) {
              details = {
                poster: proposal.poster,
                genre: proposal.genre,
                runtime: proposal.runtime,
                year: proposal.year,
                director: proposal.director,
                plot: proposal.plot,
                imdbRating: proposal.imdb_rating,
                imdbId: proposal.imdb_id
              };
            } else if (existingId) {
              details = await fetchExistingProposalDetails(existingId);
            }

            const proposalId = proposal?.id || existingId;

            // Persist default rating of 5 for the proposer on new proposals
            if (proposal?.id) {
              await supabase.from('movie_ratings').upsert({
                proposal_id: proposal.id,
                person_id: person.id,
                rating: 5,
              }, { onConflict: 'proposal_id,person_id' });
            }

            return { movieTitle, details, proposalId };

          } catch (err) {
            console.error(`Failed to fetch details for "${movieTitle}":`, err);
            throw err; // Propagate error
          }
        })
      );

      setMovieRatings(prev => {
        let updatedRatings = [...prev];
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            const { movieTitle, details, proposalId } = result.value;
            updatedRatings = updatedRatings.map(m => 
              m.movieTitle === movieTitle 
                ? { 
                    ...m, 
                    details,
                    proposalId,
                    proposerId: person.id // Ensure proposerId is set here too
                  }
                : m
            );
          } else {
            // Handle rejected promises (e.g., remove from optimistic update or mark as failed)
            // For now, if it failed, it means the proposal wasn't created, so we remove the optimistic entry.
            const failedMovieTitle = (result.reason.message || '').replace('Edge function failed for "', '').replace('"', '');
            updatedRatings = updatedRatings.filter(m => m.movieTitle !== failedMovieTitle);
            toast({
              title: "Error",
              description: `Failed to add "${failedMovieTitle}". Please try again.`,
              variant: "destructive"
            });
          }
        });
        return updatedRatings;
      });
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
  }).filter(movie => {
    // Only show movies proposed by a present person
    const proposerId = (movie as any).proposerId || (movie as any).proposer_id;
    if (!proposerId || !presentPeople.some(p => p.id === proposerId)) return false;

    // Require at least one vote from a present non-proposer so a lone default-5
    // from the proposer doesn't inflate the ranking before anyone else has weighed in
    return presentPeople.some(p => p.id !== proposerId && typeof movie.ratings[p.id] === "number" && movie.ratings[p.id] > 0);
  }).sort((a, b) => b.averageRating - a.averageRating);

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

    console.log("Setting up real-time subscriptions for session:", sessionId);

    const ratingsChannel = supabase
      .channel(`session-ratings-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movie_ratings'
        },
        (payload) => {
          console.log("Real-time rating update received:", payload);
          const proposalId = payload.new?.proposal_id || payload.old?.proposal_id;

          setMovieRatings(currentRatings => {
            const hasProposalIds = currentRatings.some(m => (m as any).proposalId);
            const isRelevant = currentRatings.some(m => (m as any).proposalId === proposalId);

            if (!hasProposalIds) {
              console.log("Ignoring rating update: proposalIds not yet attached to local state.");
              return currentRatings;
            }

            if (!isRelevant) {
              console.log(`Ignoring rating update: proposalId ${proposalId} not found in current session movies.`);
              return currentRatings;
            }

            return currentRatings.map(movie => {
              if ((movie as any).proposalId === proposalId) {
                const newRatings = { ...movie.ratings };

                if (payload.eventType === 'DELETE') {
                  // If person_id is missing in old payload, we might need to find it by value if we stored it,
                  // but usually for DELETE it should be there if replica identity is set.
                  const personId = payload.old.person_id;
                  if (personId) {
                    delete newRatings[personId];
                  } else {
                    console.warn("DELETE rating payload missing person_id. Cannot remove from local state.");
                  }
                } else {
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

    const peopleChannel = supabase
      .channel(`session-people-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_people',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log("Real-time people update received:", payload);
          if (payload.eventType === 'INSERT') {
            const newPerson = payload.new;
            setPeople(prev => {
              if (prev.some(p => p.id === newPerson.id)) return prev;
              return [...prev, {
                id: newPerson.id,
                name: newPerson.name,
                movies: [],
                isPresent: newPerson.is_present
              }];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedPerson = payload.new;
            setPeople(prev => prev.map(p => 
              p.id === updatedPerson.id 
                ? { ...p, name: updatedPerson.name, isPresent: updatedPerson.is_present }
                : p
            ));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setPeople(prev => prev.filter(p => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    const proposalsChannel = supabase
      .channel(`session-proposals-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movie_proposals',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log("Real-time proposal update received:", payload);
          if (payload.eventType === 'INSERT') {
            const newProposal = payload.new;
            
            setMovieRatings(prev => {
              if (prev.some(m => (m as any).proposalId === newProposal.id)) return prev;
              
              const proposer = peopleRef.current.find(p => p.id === newProposal.person_id);
              
              const newMovie: MovieRating = {
                movieTitle: newProposal.movie_title,
                proposedBy: proposer?.name || 'Unknown',
                ratings: {},
                proposalId: newProposal.id,
                proposerId: newProposal.person_id,
                details: newProposal.poster ? {
                  poster: newProposal.poster,
                  genre: newProposal.genre,
                  runtime: newProposal.runtime,
                  year: newProposal.year,
                  director: newProposal.director,
                  plot: newProposal.plot,
                  imdbRating: newProposal.imdb_rating,
                  imdbId: newProposal.imdb_id
                } : undefined
              };
              
              return [...prev, newMovie];
            });

            setPeople(prev => prev.map(p => 
              p.id === newProposal.person_id 
                ? { ...p, movies: Array.from(new Set([...p.movies, newProposal.movie_title])) }
                : p
            ));

          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new;
            setMovieRatings(prev => prev.map(m => 
              (m as any).proposalId === updated.id 
                ? { 
                    ...m, 
                    movieTitle: updated.movie_title,
                    details: updated.poster ? {
                      poster: updated.poster,
                      genre: updated.genre,
                      runtime: updated.runtime,
                      year: updated.year,
                      director: updated.director,
                      plot: updated.plot,
                      imdbRating: updated.imdb_rating,
                      imdbId: updated.imdb_id
                    } : m.details
                  }
                : m
            ));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setMovieRatings(prev => prev.filter(m => (m as any).proposalId !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      console.log("Removing real-time subscriptions");
      supabase.removeChannel(ratingsChannel);
      supabase.removeChannel(peopleChannel);
      supabase.removeChannel(proposalsChannel);
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
