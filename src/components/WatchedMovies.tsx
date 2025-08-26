import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Film } from "lucide-react";
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

  const presentPeople = people.filter(p => p.is_present);

  const getMovieRatings = (movieId: string) => {
    return detailedRatings.filter(r => r.watched_movie_id === movieId);
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
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {movie.poster && movie.poster !== 'N/A' ? (
                          <img 
                            src={movie.poster} 
                            alt={`${movie.movie_title} poster`}
                            className="w-16 h-24 object-cover rounded-lg shadow-sm flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-24 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Film className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {movie.imdb_id ? (
                            <a 
                              href={`https://www.imdb.com/title/${movie.imdb_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-lg hover:text-primary transition-colors truncate hover:underline"
                            >
                              {movie.movie_title}
                            </a>
                          ) : (
                            <h3 className="font-semibold text-lg truncate">
                              {movie.movie_title}
                            </h3>
                          )}
                          <p className="text-sm text-muted-foreground mb-1">
                            Proposed by {movie.proposed_by}
                          </p>
                          {(movie.year || movie.runtime || movie.genre) && (
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {movie.year && <p>Year: {movie.year}</p>}
                              {movie.runtime && <p>Runtime: {movie.runtime}</p>}
                              {movie.genre && <p className="truncate">Genre: {movie.genre}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 flex-shrink-0">
                        ★ {getAverageRating(movie.id).toFixed(1)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Rate this movie (0-10)</h4>
                      <div className="grid gap-2 sm:grid-cols-1">
                        {presentPeople.map((person) => (
                          <div key={person.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
                            <span className="text-sm truncate mr-2">{person.name}</span>
                            <DetailedRating
                              rating={getRatingForPerson(movie.id, person.id)}
                              onRatingChange={(rating) => updateDetailedRating(movie.id, person.id, rating)}
                              readonly={false}
                              size="md"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
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
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          {movie.poster && movie.poster !== 'N/A' ? (
                            <img 
                              src={movie.poster} 
                              alt={`${movie.movie_title} poster`}
                              className="w-16 h-24 object-cover rounded-lg shadow-sm flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-24 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Film className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {movie.imdb_id ? (
                              <a 
                                href={`https://www.imdb.com/title/${movie.imdb_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-lg hover:text-primary transition-colors truncate hover:underline"
                              >
                                {movie.movie_title}
                              </a>
                            ) : (
                              <h3 className="font-semibold text-lg truncate">
                                {movie.movie_title}
                              </h3>
                            )}
                            <p className="text-sm text-muted-foreground mb-1">
                              Proposed by {movie.proposed_by}
                            </p>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>Ratings: {getMovieRatings(movie.id).length}/{presentPeople.length}</p>
                              {movie.year && <p>Year: {movie.year}</p>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 mb-2">
                            ★ {getAverageRating(movie.id).toFixed(1)}/10
                          </Badge>
                          <DetailedRating rating={getAverageRating(movie.id)} readonly size="sm" />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};