import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Film, ChevronDown, ChevronRight } from "lucide-react";
import { StarRating } from "./StarRating";
import { DetailedRating } from "./DetailedRating";
import { PersonCard } from "./PersonCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
}

interface Person {
  id: string;
  name: string;
  is_present: boolean;
}

interface WatchedMoviesProps {
  sessionId: string;
  onBack: () => void;
}

export const WatchedMovies = ({ sessionId, onBack }: WatchedMoviesProps) => {
  const [watchedMovies, setWatchedMovies] = useState<WatchedMovie[]>([]);
  const [detailedRatings, setDetailedRatings] = useState<DetailedRating[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedMovies, setCollapsedMovies] = useState<Record<string, boolean>>({});
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

  const updateDetailedRating = async (watchedMovieId: string, personId: string, rating: number) => {
    try {
      const { error } = await supabase
        .from("detailed_ratings")
        .upsert({
          watched_movie_id: watchedMovieId,
          person_id: personId,
          rating: rating
        }, {
          onConflict: "watched_movie_id,person_id"
        });

      if (error) throw error;

      // Update local state
      setDetailedRatings(prev => {
        const existing = prev.find(r => r.watched_movie_id === watchedMovieId && r.person_id === personId);
        if (existing) {
          return prev.map(r => 
            r.watched_movie_id === watchedMovieId && r.person_id === personId 
              ? { ...r, rating } 
              : r
          );
        } else {
          return [...prev, {
            id: `temp-${Date.now()}`,
            watched_movie_id: watchedMovieId,
            person_id: personId,
            rating
          }];
        }
      });

      toast({
        title: "Rating saved",
        description: `Rating of ${rating}/10 saved successfully`,
      });
    } catch (error) {
      console.error("Error saving rating:", error);
      toast({
        title: "Error",
        description: "Failed to save rating",
        variant: "destructive",
      });
    }
  };

  const presentPeople = people;

  const getMovieRatings = (movieId: string) => {
    // Only include ratings > 0
    return detailedRatings.filter(r => r.watched_movie_id === movieId && r.rating > 0);
  };

  const getAverageRating = (movieId: string) => {
    const ratings = getMovieRatings(movieId);
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  };

  const getRatingForPerson = (movieId: string, personId: string) => {
    const rating = detailedRatings.find(r => r.watched_movie_id === movieId && r.person_id === personId);
    return rating?.rating || 0;
  };

  const toggleCollapse = (movieId: string) => {
    setCollapsedMovies(prev => ({
      ...prev,
      [movieId]: !prev[movieId]
    }));
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
        <div className="flex items-center justify-between mb-6">
          <Button 
            onClick={onBack} 
            variant="ghost" 
            className="hover:bg-secondary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Session
          </Button>
          <h1 className="text-2xl font-bold flex items-center">
            <Star className="w-6 h-6 mr-2 text-primary" />
            Watched Movies
          </h1>
        </div>

        <Tabs defaultValue="rate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rate">Rate Movies</TabsTrigger>
            <TabsTrigger value="rankings">Rankings</TabsTrigger>
          </TabsList>

          <TabsContent value="rate" className="space-y-4">
            {watchedMovies.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No movies have been marked as watched yet.</p>
                </CardContent>
              </Card>
            ) : (
              watchedMovies.map((movie) => (
                <Card key={movie.id} className="transition-all duration-300 hover:shadow-glow">
                  <CardHeader className="pb-3 p-4">
                    {/* Mobile-first layout with responsive adjustments */}
                    <div className="space-y-3 sm:space-y-0">
                      {/* Header with title, toggle, and rating */}
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
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>Proposed by {movie.proposed_by}</p>
                              {movie.year && <p>Year: {movie.year}</p>}
                              {movie.runtime && <p>Runtime: {movie.runtime}</p>}
                              {movie.genre && <p className="break-words">Genre: {movie.genre}</p>}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 flex-shrink-0 ml-2">
                          ★ {getAverageRating(movie.id).toFixed(1)}
                        </Badge>
                      </div>

                      {/* Content area with poster and details */}
                      <div className="flex gap-3">
                        {/* Poster - smaller on mobile */}
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
                        
                        {/* Movie details */}
                        <div className="flex-1 min-w-0 space-y-2">
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
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>Proposed by {movie.proposed_by}</p>
                            {movie.year && <p>Year: {movie.year}</p>}
                            {movie.runtime && <p>Runtime: {movie.runtime}</p>}
                            {movie.genre && <p className="break-words">Genre: {movie.genre}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {!collapsedMovies[movie.id] && (
                    <CardContent className="space-y-4 p-4 pt-0">
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <h4 className="text-sm font-medium">Rate this movie (0-10)</h4>
                          <Badge variant="outline" className="text-xs">
                            {getMovieRatings(movie.id).length}/{presentPeople.length} rated
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {presentPeople.map((person) => (
                            <div key={person.id} className="p-3 bg-card/50 rounded-lg border border-border/50">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                <span className="text-sm font-medium flex-1 min-w-0 truncate">{person.name}</span>
                                {getRatingForPerson(movie.id, person.id) > 0 && (
                                  <Badge variant="secondary" className="text-xs self-start sm:self-auto">
                                    ★ {getRatingForPerson(movie.id, person.id)}/10
                                  </Badge>
                                )}
                              </div>
                              <select
                                className="w-full p-2 rounded bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition text-sm"
                                value={getRatingForPerson(movie.id, person.id)}
                                onChange={e => updateDetailedRating(movie.id, person.id, Number(e.target.value))}
                              >
                                {Array.from({ length: 11 }, (_, i) => (
                                  <option key={i} value={i}>{i}</option>
                                ))}
                              </select>
                            </div>
                          ))}
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
                  <Card key={movie.id} className="transition-all duration-300 hover:shadow-glow">
                    <CardHeader className="pb-3 p-4">
                      {/* Mobile-first layout with responsive adjustments */}
                      <div className="space-y-3 sm:space-y-0">
                        {/* Header with title and rating - always on top */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            {/* Ranking number - visible on mobile as inline badge */}
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
                              <p className="text-sm text-muted-foreground mt-1">
                                Proposed by {movie.proposed_by}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 flex-shrink-0 ml-2">
                            ★ {getAverageRating(movie.id).toFixed(1)}
                          </Badge>
                        </div>

                        {/* Content area with poster and details */}
                        <div className="flex gap-3">
                          {/* Poster - smaller on mobile */}
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
                          
                          {/* Movie details */}
                          <div className="flex-1 min-w-0 space-y-2">
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
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>Proposed by {movie.proposed_by}</p>
                              {movie.year && <p>Year: {movie.year}</p>}
                              {movie.runtime && <p>Runtime: {movie.runtime}</p>}
                              {movie.genre && <p className="break-words">Genre: {movie.genre}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 p-4 pt-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className="text-sm text-muted-foreground">
                          {getMovieRatings(movie.id).length}/{presentPeople.length} rated
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Avg: {getAverageRating(movie.id).toFixed(2)}/10
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};