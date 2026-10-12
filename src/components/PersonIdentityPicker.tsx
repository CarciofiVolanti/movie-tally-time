import { Check, ChevronDown, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PersonIdentityPickerProps {
  people: { id: string; name: string }[];
  selectedPersonId?: string | null;
  onSelect: (personId: string) => void;
}

const PersonIdentityPicker = ({ people, selectedPersonId, onSelect }: PersonIdentityPickerProps) => {
  const selectedPerson = people.find(person => person.id === selectedPersonId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Change person, currently ${selectedPerson?.name ?? "none selected"}`}
          className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <User aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="shrink-0 text-muted-foreground">Viewing as</span>
          <span className="min-w-0 truncate font-medium">{selectedPerson?.name ?? "Choose person"}</span>
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[60vh] w-64 overflow-y-auto">
        <DropdownMenuLabel>Choose who you are</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-11" onSelect={() => onSelect("")}>
          <span className="flex-1">No person selected</span>
          {!selectedPersonId && <Check aria-hidden="true" className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        {people.map(person => (
          <DropdownMenuItem key={person.id} className="min-h-11" onSelect={() => onSelect(person.id)}>
            <span className="flex-1 truncate">{person.name}</span>
            {person.id === selectedPersonId && <Check aria-hidden="true" className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PersonIdentityPicker;
