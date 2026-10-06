import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Search, RefreshCw, Film, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Person, MovieSearchResult } from "./types";

interface AddMovieDialogProps {
  sessionId: string;
  people: Person[];
  onClose: () => void;
  onMovieAdded: () => Promise<void>;
}

export const AddMovieDialog = ({ sessionId, people, onClose, onMovieAdded }: AddMovieDialogProps) => {
  const [newMovieTitle, setNewMovieTitle] = useState("");
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<MovieSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProposer, setSelectedProposer] = useState("");
  const { toast } = useToast();

  const searchMovies = async () => {
    if (!newMovieTitle.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-movie', {
        body: { title: newMovieTitle.trim() }
      });
      
      if (error) throw error;
      const results: MovieSearchResult[] = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data && typeof data === 'object' && data.title
        ? [data]
        : [];

      setSearchResults(results);
      if (results.length > 0) {
        setSelectedMovie(results[0]);
      } else {
        setSelectedMovie(null);
      }
    } catch (error) {
      console.error('Error searching movies:', error);
      setSearchResults([]);
      setSelectedMovie(null);
    } finally {
      setIsSearching(false);
    }
  };

  const addWatchedMovie = async () => {
    if (!sessionId || !selectedProposer) return;
    
    const movieTitle = selectedMovie?.title || newMovieTitle.trim();
    if (!movieTitle) return;

    try {
      const { error } = await supabase
        .from("watched_movies")
        .insert({
          session_id: sessionId,
          movie_title: movieTitle,
          proposed_by: selectedProposer,
          watched_at: selectedDate + 'T00:00:00Z',
          poster: selectedMovie?.poster,
          genre: selectedMovie?.genre,
          runtime: selectedMovie?.runtime,
          year: selectedMovie?.year,
          director: selectedMovie?.director,
          plot: selectedMovie?.plot,
          imdb_rating: selectedMovie?.imdbRating,
          imdb_id: selectedMovie?.imdbId
        });

      if (error) throw error;

      await onMovieAdded();
      handleClose();
      
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

  const handleClose = () => {
    setNewMovieTitle("");
    setSearchResults([]);
    setSelectedMovie(null);
    setSelectedProposer("");
    setHasSearched(false);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  const isMovieSelected = (result: MovieSearchResult) => {
    if (!selectedMovie) return false;
    if (selectedMovie.tmdbId && result.tmdbId) {
      return selectedMovie.tmdbId === result.tmdbId;
    }
    if (selectedMovie.imdbId && result.imdbId) {
      return selectedMovie.imdbId === result.imdbId;
    }
    return selectedMovie.title === result.title && selectedMovie.year === result.year;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-sm sm:max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mt-2 sm:mt-0">
        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Add Watched Movie</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
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
                onChange={e => {
                  setNewMovieTitle(e.target.value);
                  if (!e.target.value.trim()) {
                    setSearchResults([]);
                    setSelectedMovie(null);
                    setHasSearched(false);
                  }
                }}
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

          {searchResults.length > 0 && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Search Results ({searchResults.length} options)</Label>
                <span className="text-xs text-muted-foreground">Select one</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1.5 rounded-md border p-1 bg-background/50">
                {searchResults.map((result, index) => {
                  const selected = isMovieSelected(result);
                  return (
                    <Card 
                      key={result.tmdbId ?? index} 
                      className={`p-2.5 cursor-pointer transition-colors ${
                        selected 
                          ? 'bg-primary/20 border-primary ring-1 ring-primary' 
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => setSelectedMovie(result)}
                    >
                      <div className="flex gap-3 items-start">
                        {result.poster && result.poster !== 'N/A' ? (
                          <img
                            src={result.poster}
                            alt={`${result.title} poster`}
                            className="w-10 h-14 sm:w-12 sm:h-16 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-14 sm:w-12 sm:h-16 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                            <Film className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-semibold truncate text-sm leading-tight">{result.title}</h4>
                            {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {result.year ? `${result.year}` : ""}
                            {(result.director || result.runtime) && (
                              <span>
                                {result.year ? " • " : ""}
                                {result.director ? `Dir: ${result.director}` : ""}
                                {result.director && result.runtime ? " • " : ""}
                                {result.runtime || ""}
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {result.genre && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{result.genre}</Badge>
                            )}
                            {result.imdbRating && result.imdbRating !== 'N/A' && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">★ {result.imdbRating}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {!isSearching && hasSearched && searchResults.length === 0 && newMovieTitle.trim() && (
            <div className="text-sm text-muted-foreground p-2 border rounded-md">
              No matching movies found on TMDB. You can still add "{newMovieTitle}" without details below.
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

          {selectedMovie ? (
            <Button
              className="w-full"
              onClick={addWatchedMovie}
              disabled={!selectedProposer}
            >
              Add Selected Movie
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={addWatchedMovie}
              disabled={!newMovieTitle.trim() || !selectedProposer}
            >
              Add Without Details
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
