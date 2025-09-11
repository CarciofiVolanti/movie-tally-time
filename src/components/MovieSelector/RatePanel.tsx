import React, { useEffect, useState } from "react";
import { MovieRating, Person } from "@/types/session";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Film, RefreshCw, ChevronDown, ChevronRight, Heart } from "lucide-react";
import { MovieCard } from "../MovieCard";
import useFavouriteMovie from "@/hooks/useFavouriteMovie";
import { supabase } from "@/integrations/supabase/client";

const RatePanel = ({
  movieRatings,
  presentPeople,
  selectedPersonId,
  setSelectedPersonId,
  fetchingDetails,
  fetchAllMovieDetails,
  updateRating,
  searchMovieAgain,
  markMovieAsWatched,
  collapsedMovies,
  toggleCollapse
}: {
  movieRatings: MovieRating[];
  presentPeople: Person[];
  selectedPersonId: string;
  setSelectedPersonId: (id: string) => void;
  fetchingDetails: boolean;
  fetchAllMovieDetails: () => Promise<void>;
  updateRating: (movieTitle: string, personId: string, rating: number) => Promise<void>;
  searchMovieAgain: (title: string) => Promise<void>;
  markMovieAsWatched: (title: string) => Promise<void>;
  collapsedMovies: Record<string, boolean>;
  toggleCollapse: (title: string) => void;
}) => {
  const { favoriteProposalId, loading: favLoading, toggleFavourite } = useFavouriteMovie(selectedPersonId);
  const [localCollapsedOverrides, setLocalCollapsedOverrides] = useState<Record<string, boolean>>({});

  const selectedPersonName = presentPeople.find(p => p.id === selectedPersonId)?.name;

  const isOwnProposalFor = (movie: MovieRating) => {
    const proposerNameMatch = selectedPersonName ? selectedPersonName === movie.proposedBy : false;
    const proposerIdMatch =
      selectedPersonId &&
      (
        (movie as any).proposerId === selectedPersonId ||
        (movie as any).proposedById === selectedPersonId ||
        (movie as any).person_id === selectedPersonId ||
        (movie as any).proposed_by === selectedPersonId
      );
    return proposerNameMatch || Boolean(proposerIdMatch);
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
    const payload = {
      proposal_id: proposalId,
      author: selectedPersonId,
      comment: comment || null,
    };

    // upsert by proposal_id to avoid duplicates; this is a single, minimal DB operation
    const { error } = await supabase
      .from("proposal_comments")
      .upsert(payload, { onConflict: "proposal_id" });

    if (error) {
      // bubble error to caller (MovieCard shows Save button state); parent can show toast
      throw error;
    }

    // success — parent can re-fetch session data to surface the saved comment to others
    return;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span>Rate All Movies</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchAllMovieDetails} disabled={fetchingDetails || movieRatings.length === 0} className="text-xs">
                {fetchingDetails ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />} Update Details
              </Button>
              <Badge variant="secondary">{presentPeople.length} present</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-4 w-full max-w-xl mx-auto mt-4">
        {movieRatings.map(movie => {
          const hasVoted = selectedPersonId && movie.ratings[selectedPersonId] !== undefined && movie.ratings[selectedPersonId] > 0;
          // use attached proposalId/proposerId directly
          const proposalId = (movie as any).proposalId ?? (movie as any).proposal_id ?? null;
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
                    people={presentPeople}
                    currentPersonId={selectedPersonId}
                    onRatingChange={updateRating}
                    onSearchAgain={searchMovieAgain}
                    onMarkAsWatched={markMovieAsWatched}
                    showAllRatings={true}
                    onSaveComment={onSaveComment}   /* <-- added */
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {movieRatings.length === 0 && <Card className="text-center py-8 mt-4">
        <CardContent>
          <Film className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No movies found in this session. Add some movies to get started!</p>
        </CardContent>
      </Card>}
    </>
  );
};

export default RatePanel;