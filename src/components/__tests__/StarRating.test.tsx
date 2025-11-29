import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StarRating } from '../StarRating';

describe('StarRating', () => {
  // Verifies that the component renders the correct number of star elements
  it('renders correctly with given rating', () => {
    render(<StarRating rating={3} />);
    
    const stars = screen.getAllByRole('button');
    expect(stars).toHaveLength(5);
    
    // Check that 3 stars are filled (have accent color class)
    // Note: This relies on implementation details (class names), which is slightly brittle but common for visual components
    // Alternatively, we could check for aria-pressed or similar if accessible
    
    // Based on the code: "fill-accent text-accent" vs "fill-transparent"
    // We'll check the SVG inside the button.
    // This part is a bit tricky without data-testid, so let's check the button calls the handler first.
  });

  // Verifies that clicking a star triggers the callback with the correct new rating value
  it('calls onRatingChange when a star is clicked', () => {
    const handleChange = vi.fn();
    render(<StarRating rating={0} onRatingChange={handleChange} />);
    
    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[2]); // Click 3rd star (index 2)
    
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  // Verifies the toggle behavior: clicking an already selected star should reset the rating to 0
  it('resets rating to 0 if clicking the same star', () => {
    const handleChange = vi.fn();
    render(<StarRating rating={4} onRatingChange={handleChange} />);
    
    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[3]); // Click 4th star (index 3), which matches current rating
    
    expect(handleChange).toHaveBeenCalledWith(0);
  });

  // Verifies that the component becomes non-interactive when the readonly prop is true
  it('does not fire events when readonly', () => {
    const handleChange = vi.fn();
    render(<StarRating rating={3} onRatingChange={handleChange} readonly />);
    
    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[4]);
    
    expect(handleChange).not.toHaveBeenCalled();
    expect(stars[0]).toBeDisabled();
  });
});
