import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MovieCard } from '../MovieCard';
import { MovieRating, Person } from '@/types/session';

// Mock the StarRating component to simplify tests
vi.mock('../StarRating', () => ({
  StarRating: ({ rating, onRatingChange, readonly }: any) => (
    <div data-testid="star-rating" onClick={() => onRatingChange?.(rating + 1)}>
      Rating: {rating} {readonly ? '(ReadOnly)' : ''}
    </div>
  )
}));

const mockMovie: MovieRating = {
  movieTitle: 'Test Movie',
  proposedBy: 'Alice',
  ratings: { 'p1': 4 },
  proposerId: 'p2',
  proposalId: 'prop-123',
  details: {
    poster: 'test-poster.jpg',
    year: '2023',
    director: 'John Doe',
    genre: 'Action',
    plot: 'A great movie',
    imdbId: 'tt1234567'
  }
};

const mockPeople: Person[] = [
  { id: 'p1', name: 'Bob', isPresent: true, movies: [] },
  { id: 'p2', name: 'Alice', isPresent: true, movies: [] },
  { id: 'p3', name: 'Charlie', isPresent: false, movies: [] } // Absent
];

describe('MovieCard', () => {
  // Test that the component correctly displays static movie information
  it('renders movie details correctly', () => {
    render(
      <MovieCard
        movie={mockMovie}
        people={mockPeople}
        onRatingChange={vi.fn()}
        onSearchAgain={vi.fn()}
        onMarkAsWatched={vi.fn()}
        showAllRatings={false}
      />
    );

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('Year: 2023')).toBeInTheDocument();
    expect(screen.getByText('Proposed by Alice')).toBeInTheDocument();
    expect(screen.getByAltText('Test Movie poster')).toHaveAttribute('src', 'test-poster.jpg');
  });

  // Test the logic for calculating average rating, ensuring it only counts present people
  it('calculates and displays average rating from PRESENT people', () => {
    // Bob (p1) is present and rated 4. Alice (p2) is present and not rated. Charlie (p3) is absent.
    // Total ratings = 1 (Bob). Average = 4.
    
    render(
      <MovieCard
        movie={mockMovie}
        people={mockPeople}
        onRatingChange={vi.fn()}
        onSearchAgain={vi.fn()}
        onMarkAsWatched={vi.fn()}
        showAllRatings={false}
      />
    );
    
    // We mocked StarRating to text "Rating: 4 (ReadOnly)"
    // This is the AVERAGE rating displayed at the bottom
    // The text "1/2 ratings" should also be present (2 present people)
    expect(screen.getByText('1/2 ratings')).toBeInTheDocument();
  });

  // Test the interaction: ensuring the rating callback is fired with correct arguments
  it('allows rating when currentPersonId is provided', () => {
    const handleRatingChange = vi.fn();
    
    render(
      <MovieCard
        movie={mockMovie}
        people={mockPeople}
        currentPersonId="p1"
        onRatingChange={handleRatingChange}
        onSearchAgain={vi.fn()}
        onMarkAsWatched={vi.fn()}
        showAllRatings={false}
      />
    );

    // Find the "Your Rating" section
    expect(screen.getByText('Your Rating')).toBeInTheDocument();
    
    // Find the star rating component associated with current user (p1 has rating 4)
    // Our mock simulates a click incrementing the rating passed to it.
    // So if we click, it should call with 4+1 = 5? Or just verify the call.
    // In the component: onRatingChange?.(movie.movieTitle, currentPersonId, rating)
    
    const ratingComponent = screen.getAllByTestId('star-rating')[1]; // 0 is avg, 1 is user
    fireEvent.click(ratingComponent);
    
    expect(handleRatingChange).toHaveBeenCalledWith('Test Movie', 'p1', 5);
  });
});
