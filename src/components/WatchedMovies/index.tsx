import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddMovieDialog } from "./AddMovieDialog";
import  MovieRatingTab  from "./MovieRatingTab";
import  MovieRankings from "./MovieRankings";
import { useWatchedMoviesData } from "./hooks/useWatchedMoviesData";
import type { WatchedMoviesProps } from "./types";

export const WatchedMovies = ({ sessionId, onBack, selectedPersonId }: WatchedMoviesProps) => {
  const [showAddMovie, setShowAddMovie] = useState(false);
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
            <MovieRatingTab 
              sessionId={sessionId}
              selectedPersonId={selectedPersonId}
              {...data}
            />
          </TabsContent>

          <TabsContent value="rankings" className="space-y-4">
            <MovieRankings {...data} />
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
