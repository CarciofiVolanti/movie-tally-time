import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PeoplePanel from '../PeoplePanel';
import { Person } from '@/types/session';

// Mock PersonCard to avoid testing child implementation details here
vi.mock('../PersonCard', () => ({
  PersonCard: ({ person, onDeletePerson }: any) => (
    <div data-testid="person-card">
      {person.name}
      <button onClick={() => onDeletePerson(person.id)}>Delete</button>
    </div>
  )
}));

describe('PeoplePanel', () => {
  const mockPeople: Person[] = [
    { id: 'p1', name: 'Alice', isPresent: true, movies: [] },
    { id: 'p2', name: 'Bob', isPresent: true, movies: [] }
  ];

  // Test that the panel correctly displays the list of people passed to it
  it('renders the list of people', () => {
    render(
      <PeoplePanel
        people={mockPeople}
        onAddPerson={vi.fn()}
        onUpdatePerson={vi.fn()}
        onDeletePerson={vi.fn()}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  // Test that typing in the input and clicking Add calls the onAddPerson callback
  it('calls onAddPerson when add button is clicked', () => {
    const handleAdd = vi.fn().mockResolvedValue(undefined);
    
    render(
      <PeoplePanel
        people={mockPeople}
        onAddPerson={handleAdd}
        onUpdatePerson={vi.fn()}
        onDeletePerson={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Enter person's name...");
    const button = screen.getByText('Add Person');

    fireEvent.change(input, { target: { value: 'Charlie' } });
    fireEvent.click(button);

    expect(handleAdd).toHaveBeenCalledWith('Charlie');
  });

  // Test empty state message
  it('shows a message when no people are present', () => {
    render(
      <PeoplePanel
        people={[]}
        onAddPerson={vi.fn()}
        onUpdatePerson={vi.fn()}
        onDeletePerson={vi.fn()}
      />
    );

    expect(screen.getByText(/No people added yet/i)).toBeInTheDocument();
  });
});
