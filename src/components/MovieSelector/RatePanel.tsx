import React, { useEffect, useState } from "react";
import { MovieRating, Person } from "@/types/session";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Film, RefreshCw, ChevronDown, ChevronRight, Heart, Search, X } from "lucide-react";
import { MovieCard } from "../MovieCard";
import useFavouriteMovie from "@/hooks/useFavouriteMovie";
import { supabase } from "@/integrations/supabase/client";

const RatePanel = ({
  movieRatings,
  presentPeople,
  people,
  selectedPersonId,
  setSelectedPersonId,
  fetchingDetails,
  fetchAllMovieDetails,
  updateRating,
  updateComment,
  searchMovieAgain,
  markMovieAsWatched,
  collapsedMovies,
  toggleCollapse,
  setShouldSort,
}: {
  movieRatings: MovieRating[];
  presentPeople: Person[];
  people?: Person[];
  selectedPersonId: string;
  setSelectedPersonId: (id: string) => void;
  fetchingDetails: boolean;
  fetchAllMovieDetails: () => Promise<void>;
  updateRating: (proposalId: string, personId: string, rating: number) => Promise<void>;
  updateComment?: (proposalId: string, authorId: string, comment: string) => Promise<void>;
  searchMovieAgain: (title: string) => Promise<void>;
  markMovieAsWatched: (title: string) => Promise<void>;
  collapsedMovies: Record<string, boolean>;
  toggleCollapse: (title: string) => void;
  setShouldSort: (val: boolean) => void;
}) => {
  const { favoriteProposalId, loading: favLoading, toggleFavourite } = useFavouriteMovie(selectedPersonId);
  const [localCollapsedOverrides, setLocalCollapsedOverrides] = useState<Record<string, boolean>>({});
  const [showAllVotes, setShowAllVotes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allPeople = people ?? presentPeople;
  const displayPeople = showAllVotes ? allPeople : presentPeople;
  const selectedPersonName = allPeople.find(p => p.id === selectedPersonId)?.name;

  const isOwnProposalFor = (movie: MovieRating) => {
    if (selectedPersonId && movie.proposerId) {
      return movie.proposerId === selectedPersonId;
    }
    // Fallback to name comparison before proposerId is attached
    return selectedPersonName ? selectedPersonName === movie.proposedBy : false;
  };

  const handleToggleCollapse = (title: string) => {
    const current = collapsedMovies[title] ?? true;
    const newVal = !current;
    setLocalCollapsedOverrides(prev => ({ ...prev, [title]: newVal }));
    toggleCollapse(title);
  };

  // Persist a proposer's comment to proposal_comments (one row per proposal_id)
  const onSaveComment = async (proposalId: string, comment: string) => {
    if (!selectedPersonId) throw new Error("No selected person");
    if (!proposalId) throw new Error("Missing proposal id");

    if (updateComment) {
      await updateComment(proposalId, selectedPersonId, comment);
    } else {
      const payload = {
        proposal_id: proposalId,
        author: selectedPersonId,
        comment: comment.trim() || null,
      };

      const { error } = await supabase
        .from("proposal_comments")
        .upsert(payload, { onConflict: "proposal_id" });

      if (error) {
        throw error;
      }
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredMovieRatings = movieRatings.filter(movie => {
    if (!normalizedQuery) return true;
    return (
      movie.movieTitle.toLowerCase().includes(normalizedQuery) ||
      (movie.proposedBy && movie.proposedBy.toLowerCase().includes(normalizedQuery)) ||
      (movie.details?.genre && movie.details.genre.toLowerCase().includes(normalizedQuery)) ||
      (movie.details?.director && movie.details.director.toLowerCase().includes(normalizedQuery)) ||
      (movie.details?.year && movie.details.year.toLowerCase().includes(normalizedQuery))
    );
  });

  return (
    <>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            <div className="flex items-center gap-2">
              <span>Rate All Movies</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <div className="flex items-center space-x-2 mr-1">
                <Switch
                  id="show-all-votes"
                  checked={showAllVotes}
                  onCheckedChange={setShowAllVotes}
                />
                <Label htmlFor="show-all-votes" className="text-xs cursor-pointer select-none">
                  Show all votes
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShouldSort(true)} className="text-xs">
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh Order
              </Button>
              <Button variant="outline" size="sm" onClick={fetchAllMovieDetails} disabled={fetchingDetails || movieRatings.length === 0} className="text-xs">
                {fetchingDetails ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Update Details
              </Button>
              <Badge variant="secondary">
                {showAllVotes
                  ? `${allPeople.length} total`
                  : `${presentPeople.length} present`}
              </Badge>
            </div>
          </div>

          {movieRatings.length > 0 && (
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search movies by title, proposer, genre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 text-sm h-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-4 w-full max-w-xl mx-auto mt-4">
        {filteredMovieRatings.map(movie => {
          const hasVoted = selectedPersonId && movie.ratings[selectedPersonId] !== undefined && movie.ratings[selectedPersonId] > 0;
          // use attached proposalId/proposerId directly
          const proposalId = movie.proposalId ?? null;
          const disallowOwn = isOwnProposalFor(movie);
          const isFavourite = proposalId ? favoriteProposalId === proposalId : false;

          // prefer local optimistic override, then parent collapsed state, then default collapsed=true
          const isCollapsed = localCollapsedOverrides[movie.movieTitle] ?? collapsedMovies[movie.movieTitle] ?? true;

          return (
            <Card key={movie.movieTitle} className="w-full max-w-full relative">
              {selectedPersonId && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                  {/* hide heart entirely for own proposals or when we don't have a proposal id */}
                  {proposalId && !disallowOwn && (
                    <button
                      type="button"
                      onClick={() => toggleFavourite(proposalId)}
                      disabled={!selectedPersonId || favLoading}
                      className="p-1"
                      title={isFavourite ? "Unmark favourite" : "Mark as favourite"}
                      aria-label="Toggle favourite"
                      aria-pressed={isFavourite}
                    >
                      <Heart
                        className={`w-5 h-5 ${isFavourite ? "text-red-500 fill-current" : "text-muted-foreground"}`}
                        style={isFavourite ? { stroke: "none" } : undefined}
                      />
                    </button>
                  )}

                  <Badge variant={hasVoted ? "default" : "outline"} className={hasVoted ? "bg-green-100 text-green-800 border-green-300" : "bg-orange-100 text-orange-800 border-orange-300"}>
                    {hasVoted ? "✓ Voted" : "Not Voted"}
                  </Badge>
                </div>
              )}

              <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-2 min-w-0 w-full pr-20">
                  <button onClick={() => handleToggleCollapse(movie.movieTitle)} aria-label={isCollapsed ? "Expand" : "Collapse"} className="p-1">
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  <span className="font-semibold text-base sm:text-lg truncate min-w-0">{movie.movieTitle}</span>
                </div>
              </CardHeader>

              {!isCollapsed && (
                <CardContent>
                  <MovieCard
                    movie={movie}
                    people={displayPeople}
                    ignorePresence={showAllVotes}
                    currentPersonId={selectedPersonId}
                    onRatingChange={updateRating}
                    onSearchAgain={searchMovieAgain}
                    onMarkAsWatched={markMovieAsWatched}
                    showAllRatings={true}
                    onSaveComment={onSaveComment}
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {movieRatings.length === 0 && (
        <Card className="text-center py-8 mt-4">
          <CardContent>
            <Film className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No movies found in this session. Add some movies to get started!</p>
          </CardContent>
        </Card>
      )}

      {movieRatings.length > 0 && filteredMovieRatings.length === 0 && (
        <Card className="text-center py-8 mt-4">
          <CardContent>
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No movies found matching "{searchQuery}"</p>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default RatePanel;