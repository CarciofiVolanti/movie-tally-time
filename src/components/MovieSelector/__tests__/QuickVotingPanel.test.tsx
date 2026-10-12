import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuickVotingPanel from '../QuickVotingPanel';
import { MovieRating } from '@/types/session';

const people = [{ id: 'alice', name: 'Alice', isPresent: true, movies: [] }, { id: 'bob', name: 'Bob', isPresent: true, movies: [] }];
const movies: MovieRating[] = [
  { movieTitle: 'Already rated', proposedBy: 'Bob', proposalId: '1', ratings: { alice: 4 } },
  { movieTitle: 'First unrated', proposedBy: 'Bob', proposalId: '2', ratings: {}, details: { plot: 'A movie plot', director: 'A director' } },
  { movieTitle: 'Second unrated', proposedBy: 'Bob', proposalId: '3', ratings: { bob: 5 } },
];
const props = { people, selectedPersonId: 'alice', updateRating: vi.fn(), searchMovieAgain: vi.fn(), markMovieAsWatched: vi.fn() };

describe('QuickVotingPanel', () => {
  it('shows full details and only five voting stars, and browses unrated proposals', () => {
    render(<QuickVotingPanel {...props} movieRatings={movies} />);
    fireEvent.click(screen.getByText('Quick voting'));
    expect(screen.getByText('A movie plot')).toBeInTheDocument();
    expect(screen.queryByText('Already rated')).not.toBeInTheDocument();
    expect(screen.queryByText('Individual Ratings')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Rate \d stars?$/ })).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Previous proposal' }));
    expect(screen.getByText('Second unrated')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next proposal' }));
    expect(screen.getByText('First unrated')).toBeInTheDocument();
  });

  it('advances after saving and finishes after the last vote', async () => {
    const save = vi.fn();
    function Harness() {
      const [queue, setQueue] = useState(movies);
      return <QuickVotingPanel {...props} movieRatings={queue} updateRating={async (proposalId, personId, rating) => {
        save(proposalId, personId, rating);
        setQueue(previous => previous.map(movie => movie.proposalId === proposalId ? { ...movie, ratings: { ...movie.ratings, [personId]: rating } } : movie));
      }} />;
    }
    render(<Harness />);
    fireEvent.click(screen.getByText('Quick voting'));
    fireEvent.click(screen.getByRole('button', { name: 'Rate 5 stars' }));
    await waitFor(() => expect(screen.getByText('Second unrated')).toBeInTheDocument());
    expect(save).toHaveBeenCalledWith('2', 'alice', 5);
    fireEvent.click(screen.getByRole('button', { name: 'Rate 5 stars' }));
    await waitFor(() => expect(screen.getByText('All proposals rated.')).toBeInTheDocument());
  });

  it('uses session identity and resets when the selected person changes', () => {
    const { rerender } = render(<QuickVotingPanel {...props} selectedPersonId="" movieRatings={movies} />);
    fireEvent.click(screen.getByText('Quick voting'));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('Select who you are in the session menu.')).toBeInTheDocument();
    rerender(<QuickVotingPanel {...props} movieRatings={movies} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next proposal' }));
    rerender(<QuickVotingPanel {...props} selectedPersonId="bob" movieRatings={movies} />);
    expect(screen.getByText('Already rated')).toBeInTheDocument();
  });
});
