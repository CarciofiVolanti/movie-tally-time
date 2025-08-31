import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PersonCard, Person } from "./PersonCard";
import { MovieCard, MovieRating, MovieDetails } from "./MovieCard";
import { Users, Film, Trophy, Plus, RefreshCw, Award, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WatchedMovies } from "./WatchedMovies";
interface MovieSelectorProps {
  onNavigateToWatched?: () => void;
  onSessionLoad?: (sessionId: string) => void;
}

export const MovieSelector = ({ onNavigateToWatched, onSessionLoad }: MovieSelectorProps) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState("");
  const [movieRatings, setMovieRatings] = useState<MovieRating[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [collapsedMovies, setCollapsedMovies] = useState<Record<string, boolean>>({});
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("people");
  const [currentView, setCurrentView] = useState<'session' | 'watched'>('session');
  const {
    toast
  } = useToast();

  // Initialize session and load data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get('session');
    if (sessionIdFromUrl) {
      loadExistingSession(sessionIdFromUrl);
    } else {
      setShowNewSession(true);
      setLoading(false);
    }
  }, []);
  const loadExistingSession = async (sessionId: string) => {
    try {
      // Check if session exists
      const {
        data: session,
        error
      } = await supabase.from('movie_sessions').select().eq('id', sessionId).maybeSingle();
      if (error) throw error;
      if (session) {
        setSessionId(session.id);
        onSessionLoad?.(session.id);
        await loadSessionData(session.id);
      } else {
        setShowNewSession(true);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      setShowNewSession(true);
    } finally {
      setLoading(false);
    }
  };
  const createNewSession = async () => {
    if (!newSessionName.trim()) return;
    try {
      setLoading(true);
      const {
        data: session,
        error
      } = await supabase.from('movie_sessions').insert([{
        name: newSessionName.trim()
      }]).select().single();
      if (error) throw error;
      setSessionId(session.id);
      onSessionLoad?.(session.id);
      setShowNewSession(false);

      // Update URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('session', session.id);
      window.history.pushState({}, '', newUrl);
      await loadSessionData(session.id);
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadSessionData = async (sessionId: string) => {
    try {
      // Load people
      const {
        data: peopleData,
        error: peopleError
      } = await supabase.from('session_people').select('*').eq('session_id', sessionId);
      if (peopleError) throw peopleError;

      // Load movie proposals  
      const {
        data: proposalsData,
        error: proposalsError
      } = await supabase.from('movie_proposals').select('*').eq('session_id', sessionId);
      if (proposalsError) throw proposalsError;

      // Load ratings
      const {
        data: ratingsData,
        error: ratingsError
      } = await supabase.from('movie_ratings').select('*');
      if (ratingsError) throw ratingsError;

      // Transform data to match existing interface
      const transformedPeople: Person[] = peopleData.map(person => ({
        id: person.id,
        name: person.name,
        isPresent: person.is_present,
        movies: proposalsData.filter(p => p.person_id === person.id).map(p => p.movie_title)
      }));
      const transformedRatings: MovieRating[] = proposalsData.map(proposal => {
        const proposer = peopleData.find(p => p.id === proposal.person_id);
        const ratings: Record<string, number> = {};
        ratingsData.filter(r => r.proposal_id === proposal.id).forEach(rating => {
          ratings[rating.person_id] = rating.rating;
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
    } catch (error) {
      console.error('Error loading session data:', error);
    }
  };

  const fetchMovieDetails = async (movieTitle: string): Promise<MovieDetails | undefined> => {
    try {
      const { data, error } = await supabase.functions.invoke('search-movie', {
        body: { title: movieTitle }
      });
      
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
    } catch (error) {
      console.error('Error fetching movie details:', error);
      return undefined;
    }
  };

  const saveMovieDetailsToDatabase = async (movieTitle: string, details: MovieDetails) => {
    if (!sessionId) return;
    
    try {
      // Update all proposals for this movie title in this session
      await supabase
        .from('movie_proposals')
        .update({
          poster: details.poster,
          genre: details.genre,
          runtime: details.runtime,
          year: details.year,
          director: details.director,
          plot: details.plot,
          imdb_rating: details.imdbRating,
          imdb_id: details.imdbId
        })
        .eq('session_id', sessionId)
        .eq('movie_title', movieTitle);
    } catch (error) {
      console.error('Error saving movie details to database:', error);
    }
  };

  const fetchAllMovieDetails = async () => {
    if (movieRatings.length === 0) return;
    
    setFetchingDetails(true);
    try {
      const updatedMovies = await Promise.all(
        movieRatings.map(async (movie) => {
          if (movie.details && movie.details.poster && movie.details.poster !== 'N/A') {
            return movie; // Already has valid details
          }
          
          const details = await fetchMovieDetails(movie.movieTitle);
          if (details) {
            await saveMovieDetailsToDatabase(movie.movieTitle, details);
          }
          return { ...movie, details };
        })
      );
      
      setMovieRatings(updatedMovies);
      toast({
        title: "Success",
        description: "Movie details updated successfully!"
      });
    } catch (error) {
      console.error('Error fetching movie details:', error);
      toast({
        title: "Error", 
        description: "Failed to fetch some movie details.",
        variant: "destructive"
      });
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
        
        // Update local state
        setMovieRatings(prev => prev.map(movie => 
          movie.movieTitle === movieTitle ? { ...movie, details } : movie
        ));
        
        toast({
          title: "Success",
          description: `Updated details for "${movieTitle}"`
        });
      } else {
        toast({
          title: "Not Found",
          description: `Could not find details for "${movieTitle}"`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error searching movie again:', error);
      toast({
        title: "Error",
        description: "Failed to search for movie details",
        variant: "destructive"
      });
    } finally {
      setFetchingDetails(false);
    }
  };
  const addPerson = async () => {
    if (!newPersonName.trim() || !sessionId) return;
    try {
      const {
        data: person,
        error
      } = await supabase.from('session_people').insert([{
        session_id: sessionId,
        name: newPersonName.trim(),
        is_present: true
      }]).select().single();
      if (error) throw error;
      const newPerson: Person = {
        id: person.id,
        name: person.name,
        movies: [],
        isPresent: person.is_present
      };
      setPeople(prev => [...prev, newPerson]);
      setNewPersonName("");
    } catch (error) {
      console.error('Error adding person:', error);
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
      // Update person presence
      await supabase.from('session_people').update({
        is_present: updatedPerson.isPresent
      }).eq('id', updatedPerson.id);

      // Get current proposals for this person
      const {
        data: currentProposals
      } = await supabase.from('movie_proposals').select('movie_title').eq('person_id', updatedPerson.id);
      const currentMovies = currentProposals?.map(p => p.movie_title) || [];

      // Find movies to add and remove
      const moviesToAdd = updatedPerson.movies.filter(m => !currentMovies.includes(m));
      const moviesToRemove = currentMovies.filter(m => !updatedPerson.movies.includes(m));

      // Add new movies with automatic detail fetching
      if (moviesToAdd.length > 0) {
        for (const movie of moviesToAdd) {
          try {
            const { error } = await supabase.functions.invoke('propose-movie-with-details', {
              body: {
                sessionId,
                personId: updatedPerson.id,
                movieTitle: movie
              }
            });
            if (error) {
              console.error('Error proposing movie with details:', error);
              // Fallback to basic proposal without details
              await supabase.from('movie_proposals').insert({
                session_id: sessionId,
                person_id: updatedPerson.id,
                movie_title: movie
              });
            }
          } catch (error) {
            console.error('Error calling propose-movie-with-details function:', error);
            // Fallback to basic proposal without details
            await supabase.from('movie_proposals').insert({
              session_id: sessionId,
              person_id: updatedPerson.id,
              movie_title: movie
            });
          }
        }
      }

      // Remove movies
      if (moviesToRemove.length > 0) {
        await supabase.from('movie_proposals').delete().eq('person_id', updatedPerson.id).in('movie_title', moviesToRemove);
      }
      setPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
      await loadSessionData(sessionId); // Reload to update movie ratings
    } catch (error) {
      console.error('Error updating person:', error);
      toast({
        title: "Error",
        description: "Failed to update person. Please try again.",
        variant: "destructive"
      });
    }
  };
  const deletePerson = async (id: string) => {
    const person = people.find(p => p.id === id);
    if (!person) return;
    // Confirmation dialog
    if (!window.confirm(`Are you sure you want to remove ${person.name}? This cannot be undone.`)) return;
    try {
      await supabase.from('session_people').delete().eq('id', id);
      setPeople(prev => prev.filter(p => p.id !== id));
      await loadSessionData(sessionId!); // Reload to update movie ratings
    } catch (error) {
      console.error('Error deleting person:', error);
      toast({
        title: "Error",
        description: "Failed to remove person. Please try again.",
        variant: "destructive"
      });
    }
  };
  const updateRating = async (movieTitle: string, personId: string, rating: number) => {
    try {
      // Find the proposal for this movie
      const {
        data: proposals
      } = await supabase.from('movie_proposals').select('id').eq('movie_title', movieTitle).eq('session_id', sessionId);
      if (!proposals || proposals.length === 0) return;
      const proposalId = proposals[0].id;
      if (rating === 0) {
        // Delete the rating if it's 0
        await supabase.from('movie_ratings').delete().eq('proposal_id', proposalId).eq('person_id', personId);

        // Update local state by removing the rating
        setMovieRatings(prev => prev.map(movie => {
          if (movie.movieTitle === movieTitle) {
            const newRatings = {
              ...movie.ratings
            };
            delete newRatings[personId];
            return {
              ...movie,
              ratings: newRatings
            };
          }
          return movie;
        }));
      } else {
        // Upsert the rating
        await supabase.from("movie_ratings").upsert(
          {
            proposal_id: proposalId,
            person_id: personId,
            rating,
          },
          {
            onConflict: "proposal_id,person_id",
          }
        );


        // Update local state
        setMovieRatings(prev => prev.map(movie => movie.movieTitle === movieTitle ? {
          ...movie,
          ratings: {
            ...movie.ratings,
            [personId]: rating
          }
        } : movie));
      }
    } catch (error) {
      console.error('Error updating rating:', error);
      toast({
        title: "Error",
        description: "Failed to save rating. Please try again.",
        variant: "destructive"
      });
    }
  };
  const markMovieAsWatched = async (movieTitle: string) => {
    if (!sessionId) return;
    // Confirmation dialog
    if (!window.confirm(`Are you sure you want to mark "${movieTitle}" as watched? This will move it to the watched movies section.`)) return;
    try {
      // Find the movie proposal
      const { data: proposals, error: proposalsError } = await supabase
        .from('movie_proposals')
        .select('*')
        .eq('session_id', sessionId)
        .eq('movie_title', movieTitle)
        .single();
        
      if (proposalsError) throw proposalsError;
      if (!proposals) return;

      // Find proposer name
      const { data: proposer } = await supabase
        .from('session_people')
        .select('name')
        .eq('id', proposals.person_id)
        .single();

      // Move to watched_movies table
      const { error: insertError } = await supabase
        .from('watched_movies')
        .insert({
          session_id: sessionId,
          movie_title: movieTitle,
          proposed_by: proposer?.name || 'Unknown',
          poster: proposals.poster,
          genre: proposals.genre,
          runtime: proposals.runtime,
          year: proposals.year,
          director: proposals.director,
          plot: proposals.plot,
          imdb_rating: proposals.imdb_rating,
          imdb_id: proposals.imdb_id
        });

      if (insertError) throw insertError;

      // Remove from movie_proposals and movie_ratings
      await supabase
        .from('movie_ratings')
        .delete()
        .eq('proposal_id', proposals.id);
        
      await supabase
        .from('movie_proposals')
        .delete()
        .eq('id', proposals.id);

      // Update local state
      setMovieRatings(prev => prev.filter(movie => movie.movieTitle !== movieTitle));
      
      // Also update people state to remove the movie from their proposals
      setPeople(prev => prev.map(person => ({
        ...person,
        movies: person.movies.filter(movie => movie !== movieTitle)
      })));
      
      toast({
        title: "Movie marked as watched",
        description: `"${movieTitle}" has been moved to watched movies section`,
      });
      
    } catch (error) {
      console.error('Error marking movie as watched:', error);
      toast({
        title: "Error",
        description: "Failed to mark movie as watched",
        variant: "destructive",
      });
    }
  };

  const toggleCollapse = (movieTitle: string) => {
    setCollapsedMovies(prev => ({
      ...prev,
      [movieTitle]: !prev[movieTitle]
    }));
  };

  const getSortedMovies = () => {
    if (!selectedPersonId) return movieRatings;
    
    return [...movieRatings].sort((a, b) => {
      const aRated = a.ratings[selectedPersonId] !== undefined && a.ratings[selectedPersonId] > 0;
      const bRated = b.ratings[selectedPersonId] !== undefined && b.ratings[selectedPersonId] > 0;
      
      // Unrated movies first
      if (!aRated && bRated) return -1;
      if (aRated && !bRated) return 1;
      return 0;
    });
  };

  const presentPeople = people.filter(p => p.isPresent);
  const rankedMovies = movieRatings.map(movie => {
    // Only count ratings > 0 and from present people
    const validRatings = presentPeople
      .map(p => movie.ratings[p.id])
      .filter(r => typeof r === "number" && r > 0);

    const averageRating = validRatings.length > 0
      ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
      : 0;

    return {
      ...movie,
      averageRating,
      totalRatings: validRatings.length
    };
  })
  .filter(movie => presentPeople.some (p => p.movies.includes(movie.movieTitle)))
  .sort((a, b) => b.averageRating - a.averageRating);
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading movie session...</p>
      </div>
    </div>;
  }
  if (showNewSession) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create New Session</CardTitle>
          <p className="text-muted-foreground">Start a new movie selection session</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input placeholder="Session name (e.g., Friday Movie Night)" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} onKeyPress={e => e.key === "Enter" && createNewSession()} />
          </div>
          <Button onClick={createNewSession} disabled={!newSessionName.trim()} className="w-full">
            Create Session
          </Button>
        </CardContent>
      </Card>
    </div>;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {currentView === 'session' ? (
        <div className="container mx-auto py-8 px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-cinema bg-clip-text text-transparent mb-4">CarciOscar</h1>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <Button variant="outline" size="sm" onClick={() => {
                setShowNewSession(true);
                setSessionId(null);
                window.history.pushState({}, '', window.location.pathname);
              }}>
                Start New Session
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentView('watched')}
                disabled={!sessionId}
                className="bg-gradient-to-r from-accent/20 to-primary/20 border-accent/40 hover:from-accent/30 hover:to-primary/30"
              >
                <Award className="w-4 h-4 mr-2" />
                Watched Movies
              </Button>
            </div>

            {/* Person selection dropdown */}
            <div className="max-w-xs mx-auto mb-4">
              <select
                value={selectedPersonId}
                onChange={e => setSelectedPersonId(e.target.value)}
                className="w-full p-2 rounded bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition text-sm"
              >
                <option value="">Select who you are (optional)</option>
                {people.map(person => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Tabs
            defaultValue="people"
            className="space-y-6"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="people" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                People ({people.length})
              </TabsTrigger>
              <TabsTrigger value="rate" className="flex items-center gap-2">
                <Film className="w-4 h-4" />
                Rate Movies ({movieRatings.length})
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="people" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add People</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input placeholder="Enter person's name..." value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyPress={e => e.key === "Enter" && addPerson()} className="flex-1" />
                    <Button onClick={addPerson} disabled={!newPersonName.trim()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Person
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {people
                  .slice() // create a shallow copy to avoid mutating state
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(person => (
                    <PersonCard
                      key={person.id}
                      person={person}
                      onUpdatePerson={updatePerson}
                      onDeletePerson={deletePerson}
                    />
                  ))}
              </div>

              {people.length === 0 && <Card className="text-center py-8">
                <CardContent>
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No people added yet. Add some people to get started!</p>
                </CardContent>
              </Card>}
            </TabsContent>

            <TabsContent value="rate" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                    <span>Rate All Movies</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchAllMovieDetails}
                        disabled={fetchingDetails || movieRatings.length === 0}
                        className="text-xs"
                      >
                        {fetchingDetails ? (
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3 mr-1" />
                        )}
                        Update Details
                      </Button>
                      <Badge variant="secondary">
                        {presentPeople.length} present
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
              </Card>

              <div className="flex flex-col gap-4 w-full max-w-xl mx-auto">
                {getSortedMovies().map(movie => {
                  const hasVoted = selectedPersonId && movie.ratings[selectedPersonId] !== undefined && movie.ratings[selectedPersonId] > 0;
                  
                  return (
                    <Card key={movie.movieTitle} className="w-full max-w-full relative">
                      {/* Voting status indicator */}
                      {selectedPersonId && (
                        <div className="absolute top-2 right-2 z-10">
                          <Badge 
                            variant={hasVoted ? "default" : "outline"} 
                            className={hasVoted ? "bg-green-100 text-green-800 border-green-300" : "bg-orange-100 text-orange-800 border-orange-300"}
                          >
                            {hasVoted ? "✓ Voted" : "Not Voted"}
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="flex flex-row items-center justify-between p-4">
                        <div className="flex items-center gap-2 min-w-0 w-full pr-20"> {/* Add right padding for the badge */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleCollapse(movie.movieTitle)}
                            aria-label={collapsedMovies[movie.movieTitle] ? "Expand" : "Collapse"}
                            className="p-1"
                          >
                            {collapsedMovies[movie.movieTitle] ? (
                              <ChevronRight className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </Button>
                          <span className="font-semibold text-base sm:text-lg truncate min-w-0">{movie.movieTitle}</span>
                        </div>
                      </CardHeader>
                      {!collapsedMovies[movie.movieTitle] && (
                        <CardContent>
                          <MovieCard
                            movie={movie}
                            people={presentPeople}
                            currentPersonId={selectedPersonId} // Pass selected person to MovieCard
                            onRatingChange={updateRating}
                            onSearchAgain={searchMovieAgain}
                            showAllRatings
                          />
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>

              {movieRatings.length === 0 && <Card className="text-center py-8">
                <CardContent>
                  <Film className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No movies suggested yet. Add people and their movie suggestions first!</p>
                </CardContent>
              </Card>}
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Top Rated Movies
                    <Badge variant="secondary">
                      Based on {presentPeople.length} present people
                    </Badge>
                  </CardTitle>
                </CardHeader>
              </Card>

              <div className="space-y-4">
                {rankedMovies.map((movie, index) => (
                  <Card key={movie.movieTitle} className="relative overflow-hidden">
                    <div className="absolute left-0 top-0 h-full w-1 bg-gradient-cinema" />
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full flex-shrink-0">
                          <span className="font-bold text-primary text-sm">#{index + 1}</span>
                        </div>
                        
                        {movie.details?.poster && movie.details.poster !== 'N/A' ? (
                          <img 
                            src={movie.details.poster} 
                            alt={`${movie.movieTitle} poster`}
                            className="w-12 h-18 sm:w-16 sm:h-24 object-cover rounded-lg shadow-sm flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-18 sm:w-16 sm:h-24 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Film className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                           {movie.details?.imdbId ? (
                             <a 
                               href={`https://www.imdb.com/title/${movie.details.imdbId}`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="font-semibold text-base sm:text-lg truncate hover:underline"
                             >
                               {movie.movieTitle}
                             </a>
                           ) : (
                             <h3 className="font-semibold text-base sm:text-lg truncate">{movie.movieTitle}</h3>
                           )}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 text-sm sm:text-lg px-2 py-1 sm:px-3">
                                ★ {movie.averageRating.toFixed(1)}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markMovieAsWatched(movie.movieTitle)}
                                className="h-8 w-8 p-0 bg-green-50 border-green-200 hover:bg-green-100 text-green-600"
                                title="Mark as watched"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                            Proposed by {movie.proposedBy} • {movie.totalRatings}/{presentPeople.length} ratings
                          </p>
                          
                          {movie.details && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-xs text-muted-foreground">
                              {movie.details.year && <p>Year: {movie.details.year}</p>}
                              {movie.details.runtime && <p>Runtime: {movie.details.runtime}</p>}
                              {movie.details.genre && <p className="sm:col-span-1 truncate">Genre: {movie.details.genre}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                      {movie.averageRating > 4 && (
                        (() => {
                          // Find people not present who rated this movie 1
                          const absentPeople = people
                            .filter(p => !p.isPresent && movie.ratings && movie.ratings[p.id] === 1)
                            .map(p => p.name);

                          return absentPeople.length > 0 ? (
                            <div className="mt-2 text-xs text-red-500">
                              <span>Rated 1 by absent: </span>
                              {absentPeople.join(", ")}
                            </div>
                          ) : null;
                        })()
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {rankedMovies.length === 0 && <Card className="text-center py-8">
                <CardContent>
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No ratings yet. Start rating movies to see results!</p>
                </CardContent>
              </Card>}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <WatchedMovies
          sessionId={sessionId!}
          onBack={() => setCurrentView('session')}
          selectedPersonId={selectedPersonId}
        />
      )}
    </div>
  );
};

useEffect(() => {
  if (activeTab === "rate" && movieRatings.length > 0) {
    setCollapsedMovies(
      movieRatings.reduce((acc, movie) => {
        acc[movie.movieTitle] = true;
        return acc;
      }, {} as Record<string, boolean>)
    );
  }
}, [activeTab, movieRatings]);