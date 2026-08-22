import { WatchedMovie } from "../hooks/useStatsData";

export const parseRuntime = (runtimeStr?: string | null): number => {
  if (!runtimeStr) return 0;
  const match = runtimeStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export const calculateTotalRuntime = (movies: WatchedMovie[]): number => {
  return movies.reduce((total, movie) => total + parseRuntime(movie.runtime), 0);
};

export const formatRuntime = (minutes: number): string => {
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);

  return parts.join(" ");
};
