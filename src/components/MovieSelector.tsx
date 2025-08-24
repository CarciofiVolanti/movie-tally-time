import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PersonCard, Person } from "./PersonCard";
import { MovieCard, MovieRating } from "./MovieCard";
import { Users, Film, Trophy, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
export const MovieSelector = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState("");
  const [movieRatings, setMovieRatings] = useState<MovieRating[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const {
    toast
  } = useToast();

  // Initialize session and load data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get('session');
    if (sessionIdFromUrl) {
      loadExistingSession(sessionIdFromUrl);
    } else {
      setShowNewSession(true);
      setLoading(false);
    }
  }, []);
  const loadExistingSession = async (sessionId: string) => {
    try {
      // Check if session exists
      const {
        data: session,
        error
      } = await supabase.from('movie_sessions').select().eq('id', sessionId).maybeSingle();
      if (error) throw error;
      if (session) {
        setSessionId(session.id);
        await loadSessionData(session.id);
      } else {
        setShowNewSession(true);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      setShowNewSession(true);
    } finally {
      setLoading(false);
    }
  };
  const createNewSession = async () => {
    if (!newSessionName.trim()) return;
    try {
      setLoading(true);
      const {
        data: session,
        error
      } = await supabase.from('movie_sessions').insert([{
        name: newSessionName.trim()
      }]).select().single();
      if (error) throw error;
      setSessionId(session.id);
      setShowNewSession(false);

      // Update URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('session', session.id);
      window.history.pushState({}, '', newUrl);
      await loadSessionData(session.id);
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadSessionData = async (sessionId: string) => {
    try {
      // Load people
      const {
        data: peopleData,
        error: peopleError
      } = await supabase.from('session_people').select('*').eq('session_id', sessionId);
      if (peopleError) throw peopleError;

      // Load movie proposals  
      const {
        data: proposalsData,
        error: proposalsError
      } = await supabase.from('movie_proposals').select('*').eq('session_id', sessionId);
      if (proposalsError) throw proposalsError;

      // Load ratings
      const {
        data: ratingsData,
        error: ratingsError
      } = await supabase.from('movie_ratings').select('*');
      if (ratingsError) throw ratingsError;

      // Transform data to match existing interface
      const transformedPeople: Person[] = peopleData.map(person => ({
        id: person.id,
        name: person.name,
        isPresent: person.is_present,
        movies: proposalsData.filter(p => p.person_id === person.id).map(p => p.movie_title)
      }));
      const transformedRatings: MovieRating[] = proposalsData.map(proposal => {
        const proposer = peopleData.find(p => p.id === proposal.person_id);
        const ratings: Record<string, number> = {};
        ratingsData.filter(r => r.proposal_id === proposal.id).forEach(rating => {
          ratings[rating.person_id] = rating.rating;
        });
        return {
          movieTitle: proposal.movie_title,
          proposedBy: proposer?.name || 'Unknown',
          ratings
        };
      });
      setPeople(transformedPeople);
      setMovieRatings(transformedRatings);
    } catch (error) {
      console.error('Error loading session data:', error);
    }
  };
  const addPerson = async () => {
    if (!newPersonName.trim() || !sessionId) return;
    try {
      const {
        data: person,
        error
      } = await supabase.from('session_people').insert([{
        session_id: sessionId,
        name: newPersonName.trim(),
        is_present: true
      }]).select().single();
      if (error) throw error;
      const newPerson: Person = {
        id: person.id,
        name: person.name,
        movies: [],
        isPresent: person.is_present
      };
      setPeople(prev => [...prev, newPerson]);
      setNewPersonName("");
    } catch (error) {
      console.error('Error adding person:', error);
      toast({
        title: "Error",
        description: "Failed to add person. Please try again.",
        variant: "destructive"
      });
    }
  };
  const updatePerson = async (updatedPerson: Person) => {
    if (!sessionId) return;
    try {
      // Update person presence
      await supabase.from('session_people').update({
        is_present: updatedPerson.isPresent
      }).eq('id', updatedPerson.id);

      // Get current proposals for this person
      const {
        data: currentProposals
      } = await supabase.from('movie_proposals').select('movie_title').eq('person_id', updatedPerson.id);
      const currentMovies = currentProposals?.map(p => p.movie_title) || [];

      // Find movies to add and remove
      const moviesToAdd = updatedPerson.movies.filter(m => !currentMovies.includes(m));
      const moviesToRemove = currentMovies.filter(m => !updatedPerson.movies.includes(m));

      // Add new movies
      if (moviesToAdd.length > 0) {
        await supabase.from('movie_proposals').insert(moviesToAdd.map(movie => ({
          session_id: sessionId,
          person_id: updatedPerson.id,
          movie_title: movie
        })));
      }

      // Remove movies
      if (moviesToRemove.length > 0) {
        await supabase.from('movie_proposals').delete().eq('person_id', updatedPerson.id).in('movie_title', moviesToRemove);
      }
      setPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
      await loadSessionData(sessionId); // Reload to update movie ratings
    } catch (error) {
      console.error('Error updating person:', error);
      toast({
        title: "Error",
        description: "Failed to update person. Please try again.",
        variant: "destructive"
      });
    }
  };
  const deletePerson = async (id: string) => {
    const person = people.find(p => p.id === id);
    if (!person) return;
    try {
      await supabase.from('session_people').delete().eq('id', id);
      setPeople(prev => prev.filter(p => p.id !== id));
      await loadSessionData(sessionId!); // Reload to update movie ratings
    } catch (error) {
      console.error('Error deleting person:', error);
      toast({
        title: "Error",
        description: "Failed to remove person. Please try again.",
        variant: "destructive"
      });
    }
  };
  const updateRating = async (movieTitle: string, personId: string, rating: number) => {
    try {
      // Find the proposal for this movie
      const {
        data: proposals
      } = await supabase.from('movie_proposals').select('id').eq('movie_title', movieTitle).eq('session_id', sessionId);
      if (!proposals || proposals.length === 0) return;
      const proposalId = proposals[0].id;
      if (rating === 0) {
        // Delete the rating if it's 0
        await supabase.from('movie_ratings').delete().eq('proposal_id', proposalId).eq('person_id', personId);

        // Update local state by removing the rating
        setMovieRatings(prev => prev.map(movie => {
          if (movie.movieTitle === movieTitle) {
            const newRatings = {
              ...movie.ratings
            };
            delete newRatings[personId];
            return {
              ...movie,
              ratings: newRatings
            };
          }
          return movie;
        }));
      } else {
        // Upsert the rating
        await supabase.from("movie_ratings").upsert(
          {
            proposal_id: proposalId,
            person_id: personId,
            rating,
          },
          {
            onConflict: "proposal_id,person_id",
          }
        );


        // Update local state
        setMovieRatings(prev => prev.map(movie => movie.movieTitle === movieTitle ? {
          ...movie,
          ratings: {
            ...movie.ratings,
            [personId]: rating
          }
        } : movie));
      }
    } catch (error) {
      console.error('Error updating rating:', error);
      toast({
        title: "Error",
        description: "Failed to save rating. Please try again.",
        variant: "destructive"
      });
    }
  };
  const presentPeople = people.filter(p => p.isPresent);
  const rankedMovies = movieRatings.map(movie => ({
    ...movie,
    averageRating: presentPeople.length > 0 ? presentPeople.reduce((sum, p) => sum + (movie.ratings[p.id] || 0), 0) / presentPeople.length : 0,
    totalRatings: presentPeople.filter(p => movie.ratings[p.id] !== undefined).length
  })).filter(movie => presentPeople.some(p => p.movies.includes(movie.movieTitle))).sort((a, b) => b.averageRating - a.averageRating);
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading movie session...</p>
      </div>
    </div>;
  }
  if (showNewSession) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create New Session</CardTitle>
          <p className="text-muted-foreground">Start a new movie selection session</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input placeholder="Session name (e.g., Friday Movie Night)" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} onKeyPress={e => e.key === "Enter" && createNewSession()} />
          </div>
          <Button onClick={createNewSession} disabled={!newSessionName.trim()} className="w-full">
            Create Session
          </Button>
        </CardContent>
      </Card>
    </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-cinema bg-clip-text text-transparent mb-4">CarciOscar</h1>

        <Button variant="outline" size="sm" onClick={() => {
          setShowNewSession(true);
          setSessionId(null);
          window.history.pushState({}, '', window.location.pathname);
        }} className="mt-2">
          Start New Session
        </Button>
      </div>

      <Tabs defaultValue="people" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="people" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            People ({people.length})
          </TabsTrigger>
          <TabsTrigger value="rate" className="flex items-center gap-2">
            <Film className="w-4 h-4" />
            Rate Movies ({movieRatings.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add People</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input placeholder="Enter person's name..." value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyPress={e => e.key === "Enter" && addPerson()} className="flex-1" />
                <Button onClick={addPerson} disabled={!newPersonName.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Person
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {people.map(person => <PersonCard key={person.id} person={person} onUpdatePerson={updatePerson} onDeletePerson={deletePerson} />)}
          </div>

          {people.length === 0 && <Card className="text-center py-8">
            <CardContent>
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No people added yet. Add some people to get started!</p>
            </CardContent>
          </Card>}
        </TabsContent>

        <TabsContent value="rate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Rate All Movies
                <Badge variant="secondary">
                  {presentPeople.length} present
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {movieRatings.map(movie =>
              <MovieCard
                key={movie.movieTitle}
                movie={movie}
                people={presentPeople}
                onRatingChange={updateRating}
                showAllRatings
              />
            )}
          </div>

          {movieRatings.length === 0 && <Card className="text-center py-8">
            <CardContent>
              <Film className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No movies suggested yet. Add people and their movie suggestions first!</p>
            </CardContent>
          </Card>}
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Top Rated Movies
                <Badge variant="secondary">
                  Based on {presentPeople.length} present people
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            {rankedMovies.map((movie, index) => <Card key={movie.movieTitle} className="relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-1 bg-gradient-cinema" />
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                    <span className="font-bold text-primary">#{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{movie.movieTitle}</h3>
                    <p className="text-sm text-muted-foreground">
                      Proposed by {movie.proposedBy} • {movie.totalRatings}/{presentPeople.length} ratings
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 text-lg px-3 py-1">
                  ★ {movie.averageRating.toFixed(1)}
                </Badge>
              </CardContent>
            </Card>)}
          </div>

          {rankedMovies.length === 0 && <Card className="text-center py-8">
            <CardContent>
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No ratings yet. Start rating movies to see results!</p>
            </CardContent>
          </Card>}
        </TabsContent>
      </Tabs>
    </div>
  </div>;
};