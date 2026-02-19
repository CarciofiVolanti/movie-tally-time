import React, { useState } from "react";
import useMovieSession from "@/hooks/useMovieSession";
import PeoplePanel from "./PeoplePanel";
import RatePanel from "./RatePanel";
import ResultsPanel from "./ResultsPanel";
import { WatchedMovies } from "../WatchedMovies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Film, Trophy, Award } from "lucide-react";

const MovieSelectorRoot = ({ onSessionLoad }: { onSessionLoad?: (id: string) => void }) => {
  const session = useMovieSession({ onSessionLoad });
  const [newSessionName, setNewSessionName] = useState("");

  if (session.loading) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading movie session...</p>
      </div>
    </div>;
  }

  if (session.showNewSession) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create New Session</CardTitle>
          <p className="text-muted-foreground">Start a new movie selection session</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input placeholder="Session name (e.g., Friday Movie Night)" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} onKeyPress={e => e.key === "Enter" && session.createNewSession(newSessionName)} className="w-full p-2 rounded bg-input border" />
          </div>
          <Button onClick={() => session.createNewSession(newSessionName)} disabled={!newSessionName.trim()} className="w-full">
            Create Session
          </Button>
        </CardContent>
      </Card>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {session.currentView === 'session' ? (
        <div className="container mx-auto py-8 px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-cinema bg-clip-text text-transparent mb-4">CarciOscar</h1>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <Button variant="outline" size="sm" onClick={() => {
                session.setShowNewSession?.(true);
                session.setSessionId?.(null);
                window.history.pushState({}, '', window.location.pathname);
              }}>
                Start New Session
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => session.setCurrentView('watched')}
                disabled={!session.sessionId}
                className="bg-gradient-to-r from-accent/20 to-primary/20 border-accent/40 hover:from-accent/30 hover:to-primary/30"
              >
                <Award className="w-4 h-4 mr-2" />
                Watched Movies
              </Button>
            </div>

            <div className="max-w-xs mx-auto mb-4">
              <select
                value={session.selectedPersonId}
                onChange={e => session.setSelectedPersonId(e.target.value)}
                className="w-full p-2 rounded bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition text-sm"
              >
                <option value="">Select who you are (optional)</option>
                {session.people.map(person => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Tabs defaultValue="people" className="space-y-6" onValueChange={(value) => {
            if (value === "rate") {
              session.setShouldSort(true);
            }
          }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="people" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                People ({session.people.length})
              </TabsTrigger>
              <TabsTrigger value="rate" className="flex items-center gap-2">
                <Film className="w-4 h-4" />
                Rate Movies ({session.movieRatings.length})
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="people">
              <PeoplePanel
                people={session.people}
                onAddPerson={session.addPerson}
                onUpdatePerson={session.updatePerson}
                onDeletePerson={session.deletePerson}
              />
            </TabsContent>

            <TabsContent value="rate">
              <RatePanel
                movieRatings={session.getSortedMovies()}
                presentPeople={session.presentPeople}
                selectedPersonId={session.selectedPersonId}
                setSelectedPersonId={session.setSelectedPersonId}
                fetchingDetails={session.fetchingDetails}
                fetchAllMovieDetails={session.fetchAllMovieDetails}
                updateRating={session.updateRating}
                searchMovieAgain={session.searchMovieAgain}
                markMovieAsWatched={session.markMovieAsWatched}
                collapsedMovies={session.collapsedMovies}
                toggleCollapse={session.toggleCollapse}
                setShouldSort={session.setShouldSort}
              />
            </TabsContent>

            <TabsContent value="results">
              <ResultsPanel rankedMovies={session.rankedMovies} people={session.people} markMovieAsWatched={session.markMovieAsWatched} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <WatchedMovies
          sessionId={session.sessionId!}
          onBack={() => session.setCurrentView('session')}
          selectedPersonId={session.selectedPersonId}
        />
      )}
    </div>
  );
};

export default MovieSelectorRoot;