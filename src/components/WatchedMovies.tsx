import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Film, ChevronDown, ChevronRight, Plus, Search, X, RefreshCw } from "lucide-react";
import { StarRating } from "./StarRating";
import { DetailedRating } from "./DetailedRating";
import { PersonCard } from "./PersonCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WatchedMovie {
  id: string;
  movie_title: string;
  proposed_by: string;
  poster?: string;
  genre?: string;
  runtime?: string;
  year?: string;
  director?: string;
  plot?: string;
  imdb_rating?: string;
  imdb_id?: string;
  watched_at: string;
}

interface DetailedRating {
  id: string;
  watched_movie_id: string;
  person_id: string;
  rating: number;
  present?: boolean;
}

interface Person {
  id: string;
  name: string;
  is_present: boolean;
}

interface WatchedMoviesProps {
  sessionId: string;
  onBack: () => void;
  selectedPersonId?: string; // <-- add this
}

export const WatchedMovies = ({ sessionId, onBack, selectedPersonId }: WatchedMoviesProps) => {
  const [watchedMovies, setWatchedMovies] = useState<WatchedMovie[]>([]);
  const [detailedRatings, setDetailedRatings] = useState<DetailedRating[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedMovies, setCollapsedMovies] = useState<Record<string, boolean>>({});
  const [localPresentStates, setLocalPresentStates] = useState<Record<string, boolean>>({});
  const [showAddMovie, setShowAddMovie] = useState(false);
  const [newMovieTitle, setNewMovieTitle] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProposer, setSelectedProposer] = useState("");
  const [rateSortMode, setRateSortMode] = useState<"date-desc" | "date-asc" | "voted" | "not-voted" | "not-fully-rated">("date-desc");
  const [rateSortAsc, setRateSortAsc] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);

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

      // Load detailed ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("detailed_ratings")
        .select("*")
        .in("watched_movie_id", (moviesData || []).map(m => m.id));

      if (ratingsError) throw ratingsError;
      setDetailedRatings(ratingsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load watched movies data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      loadData();
    }
  }, [sessionId]);

  // After loading watchedMovies
  useEffect(() => {
    if (watchedMovies.length > 0) {
      // Only collapse movies that don't already have a collapse state
      setCollapsedMovies(prev => {
        const newCollapsedState = { ...prev };
        watchedMovies.forEach(movie => {
          // Only set to collapsed if this movie doesn't have a state yet
          if (!(movie.id in newCollapsedState)) {
            newCollapsedState[movie.id] = true;
          }
        });
        return newCollapsedState;
      });
    }
  }, [watchedMovies.length]); // Use watchedMovies.length instead of watchedMovies

  // Update the present checkbox default and rating logic
  const updateDetailedRating = async (
    watchedMovieId: string,
    personId: string,
    rating: number | null,
    present?: boolean
  ) => {
    try {
      // Only create/update entry if rating is provided or person is marked present
      if (rating !== null || present) {
        const { error } = await supabase
          .from("detailed_ratings")
          .upsert({
            watched_movie_id: watchedMovieId,
            person_id: personId,
            rating,
            present
          }, {
            onConflict: "watched_movie_id,person_id"
          });

        if (error) throw error;

        // Update local state
        setDetailedRatings(prev => {
          const existingIndex = prev.findIndex(r => 
            r.watched_movie_id === watchedMovieId && r.person_id === personId
          );

          if (existingIndex >= 0) {
            // Update existing rating
            const newRatings = [...prev];
            newRatings[existingIndex] = { ...newRatings[existingIndex], rating, present };
            return newRatings;
          } else {
            // Add new rating
            return [...prev, {
              id: `temp-${Date.now()}`,
              watched_movie_id: watchedMovieId,
              person_id: personId,
              rating,
              present
            }];
          }
        });

        if (rating !== null) {
          toast({
            title: "Rating saved",
            description: `Rating of ${rating}/10 saved successfully`,
          });
        }
      }
    } catch (error) {
      console.error("Error saving rating:", error);
      toast({
        title: "Error",
        description: "Failed to save rating",
        variant: "destructive",
      });
    }
  };

  const searchMovies = async () => {
    if (!newMovieTitle.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-movie', {
        body: { title: newMovieTitle.trim() }
      });
      
      if (error) throw error;
      setSearchResults([data]);
    } catch (error) {
      console.error('Error searching movies:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addWatchedMovie = async (movieData?: any) => {
    if (!sessionId || !selectedProposer) return;
    
    const movieTitle = movieData?.title || newMovieTitle.trim();
    if (!movieTitle) return;

    try {
      const { error } = await supabase
        .from("watched_movies")
        .insert({
          session_id: sessionId,
          movie_title: movieTitle,
          proposed_by: selectedProposer,
          watched_at: selectedDate + 'T00:00:00Z',
          poster: movieData?.poster,
          genre: movieData?.genre,
          runtime: movieData?.runtime,
          year: movieData?.year,
          director: movieData?.director,
          plot: movieData?.plot,
          imdb_rating: movieData?.imdbRating,
          imdb_id: movieData?.imdbId
        });

      if (error) throw error;

      // Reload data
      await loadData();
      
      // Reset form
      setShowAddMovie(false);
      setNewMovieTitle("");
      setSearchResults([]);
      setSelectedProposer("");
      setSelectedDate(new Date().toISOString().split('T')[0]);
      
      toast({
        title: "Movie added",
        description: `"${movieTitle}" has been added to watched movies`,
      });
    } catch (error) {
      console.error('Error adding watched movie:', error);
      toast({
        title: "Error",
        description: "Failed to add watched movie",
        variant: "destructive",
      });
    }
  };

  const presentPeople = people;

  const getMovieRatings = (movieId: string) => {
    // Only include non-null ratings
    return detailedRatings.filter(r => r.watched_movie_id === movieId && r.rating !== null);
  };

  const getAverageRating = (movieId: string) => {
    const ratings = getMovieRatings(movieId);
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  };

  const getRatingForPerson = (movieId: string, personId: string) => {
    const rating = detailedRatings.find(r => r.watched_movie_id === movieId && r.person_id === personId);
    return rating?.rating ?? null; // Return null if no rating exists, 0 if rating is 0
  };

  const toggleCollapse = (movieId: string) => {
    setCollapsedMovies(prev => ({
      ...prev,
      [movieId]: !prev[movieId]
    }));
  };

  // Helper: Check if selected person has voted for a movie
  const hasSelectedPersonVoted = (movieId: string) => {
    if (!selectedPersonId) return false;
    return detailedRatings.some(
      r => r.watched_movie_id === movieId && r.person_id === selectedPersonId && r.rating !== null
    );
  };

  // Helper: Check if all present people (checkbox checked) have rated a movie
  const isFullyRated = (movieId: string) => {
    // Find all people marked present for this movie (from detailedRatings or localPresentStates)
    const presentPersonIds = people
      .filter(person => {
        const localKey = `${movieId}-${person.id}`;
        // Prefer localPresentStates if set, else use DB
        if (localPresentStates.hasOwnProperty(localKey)) {
          return localPresentStates[localKey];
        }
        const detailed = detailedRatings.find(
          r => r.watched_movie_id === movieId && r.person_id === person.id
        );
        return detailed?.present ?? false;
      })
      .map(person => person.id);

    if (presentPersonIds.length === 0) return false;

    // For all present people, check if they have a non-null rating
    return presentPersonIds.every(pid =>
      detailedRatings.some(
        r => r.watched_movie_id === movieId && r.person_id === pid && r.rating !== null
      )
    );
  };

  // Sorting/filtering for Rate tab
  const getSortedFilteredMovies = () => {
    let movies = [...watchedMovies];

    if (rateSortMode === "voted" && selectedPersonId) {
      movies = movies.filter(m => hasSelectedPersonVoted(m.id));
    } else if (rateSortMode === "not-voted" && selectedPersonId) {
      movies = movies.filter(m => !hasSelectedPersonVoted(m.id));
    } else if (rateSortMode === "not-fully-rated") {
      movies = movies.filter(m => !isFullyRated(m.id));
    }

    // Sorting
    if (rateSortMode === "date-desc" || rateSortMode === "date-asc") {
      movies.sort((a, b) => {
        const aDate = new Date(a.watched_at).getTime();
        const bDate = new Date(b.watched_at).getTime();
        return rateSortMode === "date-desc"
          ? bDate - aDate
          : aDate - bDate;
      });
    } else if (rateSortMode === "voted" || rateSortMode === "not-voted" || rateSortMode === "not-fully-rated") {
      // Secondary sort by date desc/asc
      movies.sort((a, b) => {
        const aDate = new Date(a.watched_at).getTime();
        const bDate = new Date(b.watched_at).getTime();
        return rateSortAsc ? aDate - bDate : bDate - aDate;
      });
    }

    if (rateSortAsc && (rateSortMode === "date-desc" || rateSortMode === "date-asc")) {
      movies.reverse();
    }

    return movies;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading watched movies...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <Button 
            onClick={onBack} 
            variant="ghost" 
            className="hover:bg-secondary/80 self-start"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Session
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-primary" />
              Watched Movies
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddMovie(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Movie
            </Button>
          </div>
        </div>

        <Tabs defaultValue="rate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rate">Rate Movies</TabsTrigger>
            <TabsTrigger value="rankings">Rankings</TabsTrigger>
          </TabsList>

          <TabsContent value="rate" className="space-y-4">
            {/* --- Sorting/Filtering Controls --- */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <div className="flex gap-2 items-center">
                <Label htmlFor="sort-mode" className="text-xs">Sort/Filter:</Label>
                <select
                  id="sort-mode"
                  value={rateSortMode}
                  onChange={e => setRateSortMode(e.target.value as any)}
                  className="p-1 rounded border border-border bg-card text-xs"
                >
                  <option value="date-desc">Date (Newest)</option>
                  <option value="date-asc">Date (Oldest)</option>
                  {selectedPersonId && <option value="voted">Voted (Selected Person)</option>}
                  {selectedPersonId && <option value="not-voted">Not Voted (Selected Person)</option>}
                  <option value="not-fully-rated">Not Fully Rated</option>
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-1"
                  onClick={() => setRateSortAsc(v => !v)}
                  aria-label="Toggle ascending/descending"
                >
                  {rateSortAsc ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  )}
                </Button>
              </div>
              {rateSortMode === "not-fully-rated" && (
                <span className="text-xs text-muted-foreground">Showing movies not yet rated by all present people</span>
              )}
            </div>
            {/* --- End Sorting/Filtering Controls --- */}

            {getSortedFilteredMovies().length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No movies have been marked as watched yet.</p>
                </CardContent>
              </Card>
            ) : (
              getSortedFilteredMovies().map((movie) => (
                <Card key={movie.id} className="transition-all duration-300 hover:shadow-glow relative">
                  <CardHeader className="pb-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <button
                          onClick={() => toggleCollapse(movie.id)}
                          aria-label={collapsedMovies[movie.id] ? "Expand" : "Collapse"}
                          className="p-1 rounded hover:bg-accent/20 transition flex-shrink-0 mt-1"
                          type="button"
                        >
                          {collapsedMovies[movie.id] ? (
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          {movie.imdb_id ? (
                            <a 
                              href={`https://www.imdb.com/title/${movie.imdb_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-base sm:text-lg hover:text-primary transition-colors block hover:underline leading-tight"
                            >
                              {movie.movie_title}
                            </a>
                          ) : (
                            <h3 className="font-semibold text-base sm:text-lg leading-tight">
                              {movie.movie_title}
                            </h3>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Add voting status badge here */}
                        {selectedPersonId && (
                          (() => {
                            const hasVoted = detailedRatings.find(
                              r => r.watched_movie_id === movie.id && 
                              r.person_id === selectedPersonId && 
                              r.rating !== null // Check that rating is not null
                            ) !== undefined;
                            return (
                              <Badge
                                variant={hasVoted ? "default" : "outline"}
                                className={hasVoted
                                  ? "bg-green-100 text-green-800 border-green-300"
                                  : "bg-orange-100 text-orange-800 border-orange-300"}
                              >
                                {hasVoted ? "✓ Voted" : "Not Voted"}
                              </Badge>
                            );
                          })()
                        )}
                        {/* Average rating badge */}
                        <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                          ★ {getAverageRating(movie.id).toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  {!collapsedMovies[movie.id] && (
                    <CardContent className="space-y-4 p-4 pt-0">
                      {/* Movie info and details */}
                      <div className="flex gap-3">
                        {/* Poster */}
                        {movie.poster && movie.poster !== 'N/A' ? (
                          <img 
                            src={movie.poster} 
                            alt={`${movie.movie_title} poster`}
                            className="w-12 h-18 sm:w-16 sm:h-24 object-cover rounded-lg shadow-sm flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-18 sm:w-16 sm:h-24 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Film className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                          </div>
                        )}
                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>Proposed by {movie.proposed_by}</p>
                            <p>Watched on {(() => {
                              const d = new Date(movie.watched_at);
                              const day = String(d.getDate()).padStart(2, '0');
                              const month = String(d.getMonth() + 1).padStart(2, '0');
                              const year = String(d.getFullYear()).slice(-2);
                              return `${day}/${month}/${year}`;
                            })()}</p>
                            {movie.year && <p>Year: {movie.year}</p>}
                            {movie.runtime && <p>Runtime: {movie.runtime}</p>}
                            {movie.genre && <p className="break-words">Genre: {movie.genre}</p>}
                          </div>
                        </div>
                      </div>
                      {/* Ratings UI */}
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <h4 className="text-sm font-medium">Rate this movie (0-10)</h4>
                          <Badge variant="outline" className="text-xs self-start sm:self-auto">
                            {getMovieRatings(movie.id).length}/{presentPeople.length} rated
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {presentPeople.map((person) => {
                            const detailed = detailedRatings.find(
                              r => r.watched_movie_id === movie.id && r.person_id === person.id
                            );
                            // Default to absent (false) if no DB entry exists
                            const isPresent = detailed?.present ?? false; // Changed from true to false
                            const localKey = `${movie.id}-${person.id}`;
                            const localPresent = localPresentStates[localKey] ?? isPresent;

                            return (
                              <div key={person.id} className="p-3 bg-card/50 rounded-lg border border-border/50">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{person.name}</span>
                                  {getRatingForPerson(movie.id, person.id) !== null && getRatingForPerson(movie.id, person.id) >= 0 && (
                                    <Badge variant="secondary" className="text-xs self-start sm:self-auto">
                                      ★ {getRatingForPerson(movie.id, person.id)}/10
                                    </Badge>
                                  )}
                                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <input
                                      type="checkbox"
                                      checked={localPresent}
                                      onChange={async (e) => {
                                        const newPresent = e.target.checked;
                                        setLocalPresentStates(prev => ({
                                          ...prev,
                                          [localKey]: newPresent
                                        }));
                                        
                                        // Only save to DB if checking present OR if entry already exists
                                        const currentRating = getRatingForPerson(movie.id, person.id);
                                        const entryExists = detailed !== undefined;
                                        
                                        if (newPresent || entryExists) {
                                          try {
                                            await supabase
                                              .from("detailed_ratings")
                                              .upsert({
                                                watched_movie_id: movie.id,
                                                person_id: person.id,
                                                rating: currentRating,
                                                present: newPresent
                                              }, {
                                                onConflict: "watched_movie_id,person_id"
                                              });

                                            // Update local state
                                            setDetailedRatings(prev => {
                                              const existingIndex = prev.findIndex(r => 
                                                r.watched_movie_id === movie.id && r.person_id === person.id
                                              );
                                              
                                              if (existingIndex >= 0) {
                                                // Update existing entry
                                                const newRatings = [...prev];
                                                newRatings[existingIndex] = { ...newRatings[existingIndex], present: newPresent };
                                                return newRatings;
                                              } else if (newPresent) {
                                                // Create new entry only if marking as present
                                                return [...prev, {
                                                  id: `temp-${Date.now()}`,
                                                  watched_movie_id: movie.id,
                                                  person_id: person.id,
                                                  rating: currentRating,
                                                  present: newPresent
                                                }];
                                              }
                                              return prev;
                                            });
                                          } catch (error) {
                                            console.error("Error updating present status:", error);
                                            // Revert local state on error
                                            setLocalPresentStates(prev => ({
                                              ...prev,
                                              [localKey]: !newPresent
                                            }));
                                          }
                                        }
                                        // If unchecking and no entry exists, do nothing (no DB operation needed)
                                      }}
                                      className="accent-primary bg-card border-border rounded"
                                    />
                                    present
                                  </label>
                                </div>
                                <select
                                  className="w-full p-2 rounded bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition text-sm"
                                  value={(() => {
                                    const rating = getRatingForPerson(movie.id, person.id);
                                    return rating === null ? "" : rating;
                                  })()}
                                  onChange={e => {
                                    const rating = e.target.value === "" ? null : Number(e.target.value);
                                    
                                    // Always create/update DB entry when rating is given
                                    updateDetailedRating(
                                      movie.id,
                                      person.id,
                                      rating,
                                      localPresent // Use current present status
                                    );
                                  }}
                                >
                                  <option value="">- Not yet rated -</option>
                                  {Array.from({ length: 21 }, (_, i) => (
                                    <option key={i} value={i * 0.5}>{(i * 0.5).toFixed(1)}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="rankings" className="space-y-4">
            {watchedMovies.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No movies have been rated yet.</p>
                </CardContent>
              </Card>
            ) : (
              [...watchedMovies]
                .sort((a, b) => getAverageRating(b.id) - getAverageRating(a.id))
                .map((movie, index) => (
                  <Card key={movie.id} className="transition-all duration-300 hover:shadow-glow relative">
                    <CardHeader className="pb-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <button
                            onClick={() => toggleCollapse(movie.id)}
                            aria-label={collapsedMovies[movie.id] ? "Expand" : "Collapse"}
                            className="p-1 rounded hover:bg-accent/20 transition flex-shrink-0 mt-1"
                            type="button"
                          >
                            {collapsedMovies[movie.id] ? (
                              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : (
                              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                            )}
                          </button>
                          <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground font-bold text-xs sm:text-sm flex-shrink-0 mt-1">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            {movie.imdb_id ? (
                              <a 
                                href={`https://www.imdb.com/title/${movie.imdb_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-base sm:text-lg hover:text-primary transition-colors block hover:underline leading-tight"
                              >
                                {movie.movie_title}
                              </a>
                            ) : (
                              <h3 className="font-semibold text-base sm:text-lg leading-tight">
                                {movie.movie_title}
                              </h3>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 flex-shrink-0 ml-2">
                          ★ {getAverageRating(movie.id).toFixed(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    {!collapsedMovies[movie.id] && (
                      <CardContent className="space-y-2 p-4 pt-0">
                        <div className="flex gap-3">
                          {movie.poster && movie.poster !== 'N/A' ? (
                            <img 
                              src={movie.poster} 
                              alt={`${movie.movie_title} poster`}
                              className="w-12 h-18 sm:w-16 sm:h-24 object-cover rounded-lg shadow-sm flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-18 sm:w-16 sm:h-24 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Film className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>Proposed by {movie.proposed_by}</p>
                              <p>Watched on {new Date(movie.watched_at).toLocaleDateString()}</p>
                              {movie.year && <p>Year: {movie.year}</p>}
                              {movie.runtime && <p>Runtime: {movie.runtime}</p>}
                              {movie.genre && <p className="break-words">Genre: {movie.genre}</p>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <span className="text-sm text-muted-foreground">
                            {getMovieRatings(movie.id).length}/{presentPeople.length} rated
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Avg: {getAverageRating(movie.id).toFixed(2)}/10
                          </span>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))
            )}
          </TabsContent>
        </Tabs>

        {showAddMovie && (
          <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4">
            <Card className="w-full max-w-sm sm:max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mt-2 sm:mt-0">
              <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Add Watched Movie</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowAddMovie(false);
                    setNewMovieTitle("");
                    setSearchResults([]);
                  }}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="space-y-2">
                  <Label htmlFor="movie-title" className="text-sm font-medium">Movie Title</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="movie-title"
                      placeholder="Enter movie title..."
                      value={newMovieTitle}
                      onChange={e => setNewMovieTitle(e.target.value)}
                      onKeyPress={e => e.key === "Enter" && searchMovies()}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={searchMovies}
                      disabled={isSearching || !newMovieTitle.trim()}
                      className="w-full sm:w-auto"
                    >
                      {isSearching ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Move search results right here, under the search field */}
                {searchResults.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <Label className="text-sm font-medium">Search Results</Label>
                    {searchResults.map((result, index) => (
                      <Card key={index} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                        <div className="flex gap-3" onClick={() => addWatchedMovie(result)}>
                          {result.poster && result.poster !== 'N/A' ? (
                            <img
                              src={result.poster}
                              alt={`${result.title} poster`}
                              className="w-10 h-15 sm:w-12 sm:h-18 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-15 sm:w-12 sm:h-18 bg-primary/10 rounded flex items-center justify-center">
                              <Film className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate text-sm sm:text-base">{result.title}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">{result.year}</p>
                            {result.genre && (
                              <p className="text-xs text-muted-foreground truncate">{result.genre}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="proposer" className="text-sm font-medium">Proposed By</Label>
                  <select
                    id="proposer"
                    value={selectedProposer}
                    onChange={e => setSelectedProposer(e.target.value)}
                    className="w-full p-3 rounded bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition text-sm"
                  >
                    <option value="">Select proposer...</option>
                    {people.map(person => (
                      <option key={person.id} value={person.name}>{person.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="watch-date" className="text-sm font-medium">Watch Date</Label>
                  <Input
                    id="watch-date"
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full p-3"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => addWatchedMovie()}
                    disabled={!newMovieTitle.trim() || !selectedProposer}
                  >
                    Add Without Details
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => addWatchedMovie(searchResults[0])}
                    disabled={searchResults.length === 0 || !selectedProposer}
                  >
                    Add With Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};