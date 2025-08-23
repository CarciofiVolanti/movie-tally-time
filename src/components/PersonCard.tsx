import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Person {
  id: string;
  name: string;
  movies: string[];
  isPresent: boolean;
}

interface PersonCardProps {
  person: Person;
  onUpdatePerson: (person: Person) => void;
  onDeletePerson: (id: string) => void;
}

export const PersonCard = ({ person, onUpdatePerson, onDeletePerson }: PersonCardProps) => {
  const [newMovie, setNewMovie] = useState("");

  const addMovie = () => {
    if (newMovie.trim() && person.movies.length < 3) {
      onUpdatePerson({
        ...person,
        movies: [...person.movies, newMovie.trim()]
      });
      setNewMovie("");
    }
  };

  const removeMovie = (index: number) => {
    onUpdatePerson({
      ...person,
      movies: person.movies.filter((_, i) => i !== index)
    });
  };

  const togglePresent = (checked: boolean) => {
    onUpdatePerson({
      ...person,
      isPresent: checked
    });
  };

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-glow",
      person.isPresent && "ring-2 ring-primary shadow-glow"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={person.isPresent}
              onCheckedChange={togglePresent}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <h3 className="font-semibold text-lg">{person.name}</h3>
            <Badge variant={person.isPresent ? "default" : "secondary"}>
              {person.isPresent ? "Present" : "Absent"}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeletePerson(person.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Movie Suggestions ({person.movies.length}/3)
          </h4>
          
          {person.movies.map((movie, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded-md">
              <span className="text-sm">{movie}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMovie(index)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        {person.movies.length < 3 && (
          <div className="flex gap-2">
            <Input
              placeholder="Add a movie..."
              value={newMovie}
              onChange={(e) => setNewMovie(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addMovie()}
              className="flex-1"
            />
            <Button onClick={addMovie} size="sm" disabled={!newMovie.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};