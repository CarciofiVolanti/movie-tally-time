import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Star, Plus, Search, X, Trophy, Menu, BarChart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { AddMovieDialog } from "./AddMovieDialog";
import  MovieRatingTab  from "./MovieRatingTab";
import  MovieRankings from "./MovieRankings";
import { useWatchedMoviesData } from "./hooks/useWatchedMoviesData";
import type { WatchedMoviesProps } from "./types";
import { ThemeToggle } from "@/components/ThemeToggle";
import PersonIdentityPicker from "@/components/PersonIdentityPicker";

export const WatchedMovies = ({ sessionId, onBack, onShowStats, onSelectPerson, selectedPersonId }: WatchedMoviesProps) => {
  const [showAddMovie, setShowAddMovie] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { loading, ...data } = useWatchedMoviesData(sessionId);

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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredWatchedMovies = data.watchedMovies.filter(movie => {
    if (!normalizedQuery) return true;
    return (
      movie.movie_title.toLowerCase().includes(normalizedQuery) ||
      (movie.proposed_by && movie.proposed_by.toLowerCase().includes(normalizedQuery)) ||
      (movie.genre && movie.genre.toLowerCase().includes(normalizedQuery)) ||
      (movie.director && movie.director.toLowerCase().includes(normalizedQuery)) ||
      (movie.year && movie.year.toLowerCase().includes(normalizedQuery))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 px-4 pb-4">
      <div className="sticky top-0 z-40 -mx-4 mb-4 border-b border-border bg-background/95 px-4 pt-[env(safe-area-inset-top)] pb-2 backdrop-blur">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <Button
                onClick={onBack}
                variant="ghost"
                className="hover:bg-secondary/80 px-2 sm:px-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Session
              </Button>
              <div className="pl-2 sm:pl-4">
                <PersonIdentityPicker
                  people={data.people}
                  selectedPersonId={selectedPersonId}
                  onSelect={personId => onSelectPerson?.(personId)}
                />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <ThemeToggle className="shrink-0" />
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0 bg-card shadow-md" aria-label="Open session menu">
                    <Menu aria-hidden="true" className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="overflow-y-auto" aria-describedby={undefined}>
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 flex flex-col gap-3">
                    <div>
                      <PersonIdentityPicker
                        people={data.people}
                        selectedPersonId={selectedPersonId}
                        onSelect={personId => onSelectPerson?.(personId)}
                      />
                    </div>
                    <SheetClose asChild>
                      <Button variant="outline" size="sm" onClick={onBack}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Session
                      </Button>
                    </SheetClose>
                    {onShowStats && (
                      <SheetClose asChild>
                        <Button variant="outline" size="sm" onClick={onShowStats}>
                          <BarChart className="w-4 h-4 mr-2" />
                          Session Stats
                        </Button>
                      </SheetClose>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-4xl pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
            <h1 className="text-center text-xl sm:text-2xl font-bold flex items-center whitespace-nowrap">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-primary" />
              Watched Movies
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddMovie(true)}
              className="w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Movie
            </Button>
          </div>
        </div>

        {data.watchedMovies.length > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              aria-label="Search watched movies by title, proposer, or genre"
              placeholder="Search watched movies by title, proposer, genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 text-sm h-10 bg-card/60"
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

        <Tabs defaultValue="rate" className="space-y-6">
          <TabsList className="fixed inset-x-0 bottom-0 z-40 grid h-auto w-full grid-cols-2 gap-1 rounded-none border-t border-border bg-card/95 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur">
            <TabsTrigger value="rate" className="flex min-h-14 min-w-0 flex-col gap-1 rounded-lg px-1 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none">
              <Star aria-hidden="true" className="h-5 w-5" />
              Rate Movies
            </TabsTrigger>
            <TabsTrigger value="rankings" className="flex min-h-14 min-w-0 flex-col gap-1 rounded-lg px-1 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none">
              <Trophy aria-hidden="true" className="h-5 w-5" />
              Rankings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rate" className="space-y-4">
            <MovieRatingTab 
              sessionId={sessionId}
              selectedPersonId={selectedPersonId}
              {...data}
              watchedMovies={filteredWatchedMovies}
            />
          </TabsContent>

          <TabsContent value="rankings" className="space-y-4">
            <MovieRankings
              {...data}
              watchedMovies={filteredWatchedMovies}
            />
          </TabsContent>
        </Tabs>

        {showAddMovie && (
          <AddMovieDialog
            sessionId={sessionId}
            people={data.people}
            onClose={() => setShowAddMovie(false)}
            onMovieAdded={data.loadData}
          />
        )}
      </div>
    </div>
  );
};
