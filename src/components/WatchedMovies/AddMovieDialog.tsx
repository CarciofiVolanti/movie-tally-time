import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Search, RefreshCw, Film } from "lucide-react";
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProposer, setSelectedProposer] = useState("");
  const { toast } = useToast();

  const searchMovies = async () => {
    if (!newMovieTitle.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-movie', {
        body: { title: newMovieTitle.trim() }
      });
      
      if (error) throw error;
      setSearchResults([data]);
      setSelectedMovie(null);
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
    setSelectedDate(new Date().toISOString().split('T')[0]);
    onClose();
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

          {searchResults.length > 0 && (
            <div className="space-y-2 mt-3">
              <Label className="text-sm font-medium">Search Results</Label>
              {searchResults.map((result, index) => (
                <Card 
                  key={index} 
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedMovie?.imdbId === result.imdbId 
                      ? 'bg-primary/20 border-primary' 
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedMovie(result)}
                >
                  <div className="flex gap-3">
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

          {selectedMovie ? (
            <Button
              className="w-full"
              onClick={addWatchedMovie}
              disabled={!selectedProposer}
            >
              Add Movie
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
