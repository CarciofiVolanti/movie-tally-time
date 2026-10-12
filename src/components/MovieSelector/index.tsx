import React, { useState, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import useMovieSession from "@/hooks/useMovieSession";
import PeoplePanel from "./PeoplePanel";
import RatePanel from "./RatePanel";
import ResultsPanel from "./ResultsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Film, Trophy, Award, BarChart, Menu } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeToggle } from "@/components/ThemeToggle";
import PersonIdentityPicker from "@/components/PersonIdentityPicker";

const WatchedMovies = lazy(() => import("../WatchedMovies").then(m => ({ default: m.WatchedMovies })));
const Stats = lazy(() => import("../Stats"));

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
      <ThemeToggle className="fixed right-4 top-4 z-10 bg-card shadow-sm" />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create New Session</CardTitle>
          <p className="text-muted-foreground">Start a new movie selection session</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="new-session-name" className="sr-only">Session name</label>
            <input id="new-session-name" placeholder="Session name (e.g., Friday Movie Night)" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} onKeyPress={e => e.key === "Enter" && session.createNewSession(newSessionName)} className="w-full p-2 rounded bg-input border" />
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
      {session.currentView === 'session' && (
        <ErrorBoundary>
        <div className="container mx-auto pt-[calc(7rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] px-4">
          <div className="fixed inset-x-0 top-0 z-40 flex min-h-[calc(6.5rem+env(safe-area-inset-top))] items-center border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
            <div className="container mx-auto px-4">
              <div className="ml-[calc(1.5rem+1px)] pr-24">
                <h1 className="text-left text-4xl font-bold bg-gradient-cinema bg-clip-text text-transparent">CarciOscar</h1>
                <div className="mt-2">
                  <PersonIdentityPicker
                    people={session.people}
                    selectedPersonId={session.selectedPersonId}
                    onSelect={session.setSelectedPersonId}
                  />
                </div>
              </div>
            </div>
            <ThemeToggle className="absolute right-[calc(4.5rem+env(safe-area-inset-right))] top-[calc(1.25rem+env(safe-area-inset-top))] bg-card shadow-sm" />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="absolute right-[calc(1rem+env(safe-area-inset-right))] top-[calc(1.25rem+env(safe-area-inset-top))] bg-card shadow-md" aria-label="Open session menu">
                  <Menu aria-hidden="true" className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="overflow-y-auto" aria-describedby={undefined}>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
            <div className="flex flex-col gap-3 mb-6">
              <SheetClose asChild><Button
                variant="outline"
                size="sm"
                onClick={() => session.setCurrentView('watched')}
                disabled={!session.sessionId}
                className="bg-gradient-to-r from-accent/20 to-primary/20 border-accent/40 hover:from-accent/30 hover:to-primary/30"
              >
                <Award className="w-4 h-4 mr-2" />
                Watched Movies
              </Button></SheetClose>

              <SheetClose asChild><Button
                variant="outline"
                size="sm"
                onClick={() => session.setCurrentView('stats')}
                disabled={!session.sessionId}
                className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 hover:from-blue-500/20 hover:to-purple-500/20"
              >
                <BarChart className="w-4 h-4 mr-2" />
                Session Stats
              </Button></SheetClose>
            </div>

            <div className="mb-4">
              <PersonIdentityPicker
                people={session.people}
                selectedPersonId={session.selectedPersonId}
                onSelect={session.setSelectedPersonId}
              />
            </div>

                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Tabs defaultValue="people" onValueChange={(value) => {
            if (value === "rate") {
              session.setShouldSort(true);
            }
          }}>
            <TabsContent value="people">
              <PeoplePanel
                people={session.people}
                selectedPersonId={session.selectedPersonId}
                onAddPerson={session.addPerson}
                onUpdatePerson={session.updatePerson}
                onDeletePerson={session.deletePerson}
              />
            </TabsContent>

            <TabsContent value="rate">
              <RatePanel
                movieRatings={session.getSortedMovies()}
                presentPeople={session.presentPeople}
                people={session.people}
                selectedPersonId={session.selectedPersonId}
                setSelectedPersonId={session.setSelectedPersonId}
                fetchingDetails={session.fetchingDetails}
                fetchAllMovieDetails={session.fetchAllMovieDetails}
                updateRating={session.updateRating}
                updateComment={session.updateComment}
                searchMovieAgain={session.searchMovieAgain}
                markMovieAsWatched={session.markMovieAsWatched}
                collapsedMovies={session.collapsedMovies}
                toggleCollapse={session.toggleCollapse}
                setShouldSort={session.setShouldSort}
              />
            </TabsContent>

            <TabsContent value="results">
              <ResultsPanel
                rankedMovies={session.rankedMovies}
                people={session.people}
                recentlyWatched={session.recentlyWatched}
                markMovieAsWatched={session.markMovieAsWatched}
                onGoToWatched={() => session.setCurrentView('watched')}
              />
            </TabsContent>
            {createPortal(<nav aria-label="Movie session navigation" style={{ position: "fixed", left: 0, right: 0, bottom: 0 }} className="z-40 border-t border-border bg-card/95 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur">
              <TabsList aria-label="Movie session pages" className="mx-auto grid h-auto w-full max-w-lg grid-cols-3 gap-1 bg-transparent p-0">
                <TabsTrigger value="people" className="flex min-h-14 min-w-0 flex-col gap-1 rounded-lg px-1 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none">
                  <Users aria-hidden="true" className="h-5 w-5" />
                  People ({session.people.length})
                </TabsTrigger>
                <TabsTrigger value="rate" className="flex min-h-14 min-w-0 flex-col gap-1 rounded-lg px-1 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none">
                  <Film aria-hidden="true" className="h-5 w-5" />
                  Rate Movies ({session.movieRatings.length})
                </TabsTrigger>
                <TabsTrigger value="results" className="flex min-h-14 min-w-0 flex-col gap-1 rounded-lg px-1 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none">
                  <Trophy aria-hidden="true" className="h-5 w-5" />
                  Results
                </TabsTrigger>
              </TabsList>
            </nav>, document.body)}
          </Tabs>
        </div>
        </ErrorBoundary>
      )}

      {session.currentView === 'watched' && (
        <ErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
            <WatchedMovies
              sessionId={session.sessionId!}
              onBack={() => session.setCurrentView('session')}
              onShowStats={() => session.setCurrentView('stats')}
              onSelectPerson={session.setSelectedPersonId}
              selectedPersonId={session.selectedPersonId}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {session.currentView === 'stats' && (
        <ErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
            <Stats
              sessionId={session.sessionId!}
              onBack={() => session.setCurrentView('session')}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
};

export default MovieSelectorRoot;
