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

export const MovieSelector = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState("");
  const [movieRatings, setMovieRatings] = useState<MovieRating[]>([]);
  const { toast } = useToast();

  const addPerson = () => {
    if (newPersonName.trim()) {
      const newPerson: Person = {
        id: Date.now().toString(),
        name: newPersonName.trim(),
        movies: [],
        isPresent: true
      };
      setPeople([...people, newPerson]);
      setNewPersonName("");
      toast({
        title: "Person added",
        description: `${newPerson.name} has been added to the group.`
      });
    }
  };

  const updatePerson = (updatedPerson: Person) => {
    setPeople(people.map(p => p.id === updatedPerson.id ? updatedPerson : p));
    updateMovieRatings();
  };

  const deletePerson = (id: string) => {
    const person = people.find(p => p.id === id);
    setPeople(people.filter(p => p.id !== id));
    if (person) {
      toast({
        title: "Person removed",
        description: `${person.name} has been removed from the group.`
      });
    }
    updateMovieRatings();
  };

  const updateMovieRatings = () => {
    const allMovies: MovieRating[] = [];
    
    people.forEach(person => {
      person.movies.forEach(movie => {
        const existingMovie = allMovies.find(m => m.movieTitle === movie);
        if (existingMovie) return;
        
        allMovies.push({
          movieTitle: movie,
          proposedBy: person.name,
          ratings: {}
        });
      });
    });

    setMovieRatings(prevRatings => {
      return allMovies.map(movie => {
        const existingRating = prevRatings.find(r => r.movieTitle === movie.movieTitle);
        return existingRating || movie;
      });
    });
  };

  const updateRating = (movieTitle: string, personId: string, rating: number) => {
    setMovieRatings(prev => 
      prev.map(movie => 
        movie.movieTitle === movieTitle 
          ? { ...movie, ratings: { ...movie.ratings, [personId]: rating } }
          : movie
      )
    );
  };

  const presentPeople = people.filter(p => p.isPresent);
  const rankedMovies = movieRatings
    .map(movie => ({
      ...movie,
      averageRating: presentPeople.length > 0 
        ? presentPeople.reduce((sum, p) => sum + (movie.ratings[p.id] || 0), 0) / presentPeople.length
        : 0,
      totalRatings: presentPeople.filter(p => movie.ratings[p.id] !== undefined).length
    }))
    .filter(movie => presentPeople.some(p => p.movies.includes(movie.movieTitle)))
    .sort((a, b) => b.averageRating - a.averageRating);

  // Update movie ratings when people or their movies change
  useEffect(() => {
    updateMovieRatings();
  }, [people]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-cinema bg-clip-text text-transparent mb-4">
            Movie Night Selector
          </h1>
          <p className="text-muted-foreground text-lg">
            Collaborative movie selection made easy
          </p>
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
                  <Input
                    placeholder="Enter person's name..."
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addPerson()}
                    className="flex-1"
                  />
                  <Button onClick={addPerson} disabled={!newPersonName.trim()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Person
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {people.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  onUpdatePerson={updatePerson}
                  onDeletePerson={deletePerson}
                />
              ))}
            </div>

            {people.length === 0 && (
              <Card className="text-center py-8">
                <CardContent>
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No people added yet. Add some people to get started!</p>
                </CardContent>
              </Card>
            )}
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
              {movieRatings.map(movie => (
                <MovieCard
                  key={movie.movieTitle}
                  movie={movie}
                  people={presentPeople}
                  onRatingChange={(personId, rating) => 
                    updateRating(movie.movieTitle, personId, rating)
                  }
                  showAllRatings
                />
              ))}
            </div>

            {movieRatings.length === 0 && (
              <Card className="text-center py-8">
                <CardContent>
                  <Film className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No movies suggested yet. Add people and their movie suggestions first!</p>
                </CardContent>
              </Card>
            )}
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
              {rankedMovies.map((movie, index) => (
                <Card key={movie.movieTitle} className="relative overflow-hidden">
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
                </Card>
              ))}
            </div>

            {rankedMovies.length === 0 && (
              <Card className="text-center py-8">
                <CardContent>
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No ratings yet. Start rating movies to see results!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};