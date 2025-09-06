import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, Film } from "lucide-react";
import  WatchedMovieCard  from "./WatchedMovieCard";
import { useMovieRatings } from "./hooks/useMovieRatings";
import { getSortedFilteredMovies } from "./utils";
import type { WatchedMoviesData, RateSortMode } from "./types";

interface MovieRatingTabProps extends WatchedMoviesData {
  sessionId: string;
  selectedPersonId?: string;
}

const MovieRatingTab = ({ 
  sessionId, 
  selectedPersonId, 
  watchedMovies, 
  detailedRatings, 
  people, 
  setDetailedRatings 
}: MovieRatingTabProps) => {
  const [rateSortMode, setRateSortMode] = useState<RateSortMode>("date-desc");
  const [rateSortAsc, setRateSortAsc] = useState(false);
  
  const { localPresentStates, setLocalPresentStates, updateDetailedRating } = useMovieRatings(
    detailedRatings,
    setDetailedRatings
  );

  const sortedMovies = getSortedFilteredMovies(
    watchedMovies,
    rateSortMode,
    rateSortAsc,
    selectedPersonId,
    people,
    detailedRatings,
    localPresentStates
  );

  return (
    <>
      {/* Sorting/Filtering Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
        <div className="flex gap-2 items-center">
          <Label htmlFor="sort-mode" className="text-xs">Sort/Filter:</Label>
          <select
            id="sort-mode"
            value={rateSortMode}
            onChange={e => setRateSortMode(e.target.value as RateSortMode)}
            className="p-1 rounded border border-border bg-card text-xs"
          >
            <option value="date-desc">Date (Newest)</option>
            <option value="date-asc">Date (Oldest)</option>
            {selectedPersonId && <option value="voted">Voted (Selected Person)</option>}
            {selectedPersonId && <option value="not-voted">Not Voted (Selected Person)</option>}
            {selectedPersonId && <option value="absent">Absent (Selected Person)</option>}
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

      {sortedMovies.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No movies have been marked as watched yet.</p>
          </CardContent>
        </Card>
      ) : (
        sortedMovies.map((movie) => (
          <WatchedMovieCard
            key={movie.id}
            movie={movie}
            people={people}
            detailedRatings={detailedRatings}
            selectedPersonId={selectedPersonId}
            rateSortMode={rateSortMode}
            localPresentStates={localPresentStates}
            setLocalPresentStates={setLocalPresentStates}
            updateDetailedRating={updateDetailedRating}
          />
        ))
      )}
    </>
  );
};

export default MovieRatingTab;