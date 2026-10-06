import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonCard } from '../PersonCard';
import { Person } from '@/types/session';
import { MovieSearchResult } from '@/hooks/useMovieSearch';

const mockSearchMovies = vi.fn();
const mockClearResults = vi.fn();

let mockSearchState = {
  searchResults: [] as MovieSearchResult[],
  isSearching: false,
  showSearchResults: false,
  searchMovies: mockSearchMovies,
  clearResults: mockClearResults,
};

vi.mock('@/hooks/useMovieSearch', () => ({
  useMovieSearch: () => mockSearchState,
}));

describe('PersonCard', () => {
  const basePerson: Person = {
    id: 'p1',
    name: 'Alice',
    isPresent: true,
    movies: ['The Matrix'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchState = {
      searchResults: [],
      isSearching: false,
      showSearchResults: false,
      searchMovies: mockSearchMovies,
      clearResults: mockClearResults,
    };
  });

  it('renders person information and movies', () => {
    render(
      <PersonCard
        person={basePerson}
        onUpdatePerson={vi.fn()}
        onDeletePerson={vi.fn()}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Present')).toBeInTheDocument();
    expect(screen.getByText('Movie Suggestions (1/3)')).toBeInTheDocument();
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
  });

  it('allows adding movie manually with plus button', () => {
    const onUpdatePerson = vi.fn();
    render(
      <PersonCard
        person={basePerson}
        onUpdatePerson={onUpdatePerson}
        onDeletePerson={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/search for a movie/i);
    fireEvent.change(input, { target: { value: 'Interstellar' } });

    const plusBtn = screen.getByTitle(/add manually/i);
    fireEvent.click(plusBtn);

    expect(onUpdatePerson).toHaveBeenCalledWith(
      {
        ...basePerson,
        movies: ['The Matrix', 'Interstellar'],
      },
      undefined
    );
  });

  it('triggers search when search button is clicked or enter pressed', () => {
    render(
      <PersonCard
        person={basePerson}
        onUpdatePerson={vi.fn()}
        onDeletePerson={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/search for a movie/i);
    fireEvent.change(input, { target: { value: 'Dune' } });

    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(mockSearchMovies).toHaveBeenCalledWith('Dune');
  });

  it('renders multiple TMDB search options and selects one with full details', () => {
    const onUpdatePerson = vi.fn();
    mockSearchState = {
      searchResults: [
        {
          title: 'Dune: Part Two',
          year: '2024',
          director: 'Denis Villeneuve',
          runtime: '166 min',
          genre: 'Sci-Fi, Adventure',
          imdbRating: '8.5',
          imdbId: 'tt15239678',
          tmdbId: 693134,
          plot: 'Paul Atreides unites with Chani and the Fremen...',
          poster: 'https://image.tmdb.org/t/p/w500/dune2.jpg',
        },
        {
          title: 'Dune',
          year: '1984',
          director: 'David Lynch',
          runtime: '137 min',
          genre: 'Sci-Fi',
          imdbRating: '6.3',
          imdbId: 'tt0087182',
          tmdbId: 841,
          plot: 'A Duke\'s son leads desert warriors...',
          poster: 'https://image.tmdb.org/t/p/w500/dune1984.jpg',
        },
      ],
      isSearching: false,
      showSearchResults: true,
      searchMovies: mockSearchMovies,
      clearResults: mockClearResults,
    };

    render(
      <PersonCard
        person={basePerson}
        onUpdatePerson={onUpdatePerson}
        onDeletePerson={vi.fn()}
      />
    );

    expect(screen.getByText('2 options found (select one):')).toBeInTheDocument();
    expect(screen.getByText(/Dune: Part Two \(2024\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Dune \(1984\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Dir: Denis Villeneuve • 166 min/i)).toBeInTheDocument();

    // Click on Dune: Part Two option
    fireEvent.click(screen.getByText(/Dune: Part Two \(2024\)/i));

    expect(onUpdatePerson).toHaveBeenCalledWith(
      {
        ...basePerson,
        movies: ['The Matrix', 'Dune: Part Two'],
      },
      {
        'Dune: Part Two': {
          poster: 'https://image.tmdb.org/t/p/w500/dune2.jpg',
          genre: 'Sci-Fi, Adventure',
          runtime: '166 min',
          year: '2024',
          director: 'Denis Villeneuve',
          plot: 'Paul Atreides unites with Chani and the Fremen...',
          imdbRating: '8.5',
          imdbId: 'tt15239678',
          tmdbId: 693134,
        },
      }
    );
    expect(mockClearResults).toHaveBeenCalled();
  });
});
