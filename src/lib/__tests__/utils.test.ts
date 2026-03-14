import { cn, normalizeTitle } from '../utils';
import { describe, it, expect } from 'vitest';

describe('cn utility', () => {
  // Test that the utility successfully joins standard class strings
  it('merges class names correctly', () => {
    const result = cn('px-4', 'py-2');
    expect(result).toBe('px-4 py-2');
  });

  // Test that conditional classes (falsy values) are filtered out
  it('handles conditional classes', () => {
    const result = cn('px-4', true && 'py-2', false && 'bg-red-500');
    expect(result).toBe('px-4 py-2');
  });

  // Test that Tailwind conflicts are resolved correctly (using tailwind-merge logic)
  it('merges tailwind classes properly (overriding)', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });
});

describe('normalizeTitle', () => {
  it('removes leading "The " (case-insensitive)', () => {
    expect(normalizeTitle('The Matrix')).toBe('Matrix');
    expect(normalizeTitle('the matrix')).toBe('matrix');
    expect(normalizeTitle('THE MATRIX')).toBe('MATRIX');
  });

  it('does not remove "The" if it is part of a word', () => {
    expect(normalizeTitle('There Will Be Blood')).toBe('There Will Be Blood');
  });

  it('handles titles without "The"', () => {
    expect(normalizeTitle('Inception')).toBe('Inception');
  });

  it('removes extra spaces if needed after the', () => {
    expect(normalizeTitle('The  Godfather')).toBe('Godfather');
  });
});
