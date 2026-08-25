import React, { useState } from "react";
import { Person } from "@/types/session";
import { PersonCard } from "../PersonCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

import { sortPeople } from "@/lib/sessionHelpers";

interface PeoplePanelProps {
  people: Person[];
  selectedPersonId?: string;
  onAddPerson: (name: string) => Promise<void>;
  onUpdatePerson: (p: Person) => Promise<void>;
  onDeletePerson: (id: string) => Promise<void>;
}

const PeoplePanel = ({
  people,
  selectedPersonId,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
}: PeoplePanelProps) => {
  const [newPersonName, setNewPersonName] = useState("");
  const sortedPeople = sortPeople(people, selectedPersonId);

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
        {sortedPeople.map(person => (
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
