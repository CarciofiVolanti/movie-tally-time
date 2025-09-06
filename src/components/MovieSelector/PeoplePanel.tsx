import React, { useState } from "react";
import { Person } from "@/types/session";
import { PersonCard } from "../PersonCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const PeoplePanel = ({ people, onAddPerson, onUpdatePerson, onDeletePerson }: {
  people: Person[];
  onAddPerson: (name: string) => Promise<void>;
  onUpdatePerson: (p: Person) => Promise<void>;
  onDeletePerson: (id: string) => Promise<void>;
}) => {
  const [newPersonName, setNewPersonName] = useState("");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add People</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Enter person's name..." value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyPress={e => e.key === "Enter" && (onAddPerson(newPersonName).then(() => setNewPersonName("")))} className="flex-1" />
            <Button onClick={() => onAddPerson(newPersonName).then(() => setNewPersonName(""))} disabled={!newPersonName.trim()}>
              Add Person
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        {people.slice().sort((a, b) => a.name.localeCompare(b.name)).map(person => (
          <PersonCard key={person.id} person={person} onUpdatePerson={onUpdatePerson} onDeletePerson={onDeletePerson} />
        ))}
      </div>

      {people.length === 0 && <Card className="text-center py-8 mt-4">
        <CardContent>
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No people added yet. Add some people to get started!</p>
        </CardContent>
      </Card>}
    </>
  );
};

export default PeoplePanel;
