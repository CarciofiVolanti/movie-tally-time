import { cn } from '../utils';
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
  // This ensures we don't have CSS specificity issues in our components
  it('merges tailwind classes properly (overriding)', () => {
    // twMerge should handle conflict resolution (p-4 overrides px-2 py-2)
    // actually, p-4 is padding all sides. px-2 is x-axis.
    // usually later classes override. But twMerge is smart.
    // Let's test a clear conflict: bg-red-500 vs bg-blue-500
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });
});
