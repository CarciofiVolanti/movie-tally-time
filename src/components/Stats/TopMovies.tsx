import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Film } from "lucide-react";
import { WatchedMovie } from "./hooks/useStatsData";

interface MovieWithAvg extends WatchedMovie {
  averageRating: number;
  voteCount: number;
}

interface TopMoviesProps {
  movies: MovieWithAvg[];
}

export const TopMovies = ({ movies }: TopMoviesProps) => {
  const sorted = [...movies].sort((a, b) => b.averageRating - a.averageRating);
  const top3 = sorted.slice(0, 3);
  const bottom3 = [...sorted].reverse().slice(0, 3).filter(m => !top3.find(t => t.id === m.id)); // Avoid overlap if very few movies

  const renderMovieList = (list: MovieWithAvg[], emptyMsg: string) => {
    if (list.length === 0) {
      return <p className="text-sm text-muted-foreground italic">{emptyMsg}</p>;
    }
    
    return (
      <div className="space-y-3">
        {list.map((movie, idx) => (
          <div key={movie.id} className="flex items-center gap-3">
            <div className="flex-shrink-0 w-6 text-center font-bold text-muted-foreground">
              #{idx + 1}
            </div>
            {movie.poster && movie.poster !== 'N/A' ? (
              <img src={movie.poster} alt={movie.movie_title} className="w-10 h-14 object-cover rounded shadow-sm" />
            ) : (
              <div className="w-10 h-14 bg-primary/10 rounded flex items-center justify-center">
                <Film className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{movie.movie_title}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{movie.year || 'Unknown Year'}</p>
                <span className="text-[10px] text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground">{movie.voteCount} votes</p>
              </div>
            </div>
            <Badge variant="secondary" className="flex-shrink-0">
              ★ {movie.averageRating.toFixed(1)} / 10
            </Badge>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-full lg:col-span-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Highest Rated Movies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderMovieList(top3, "Not enough movies rated yet.")}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            Lowest Rated Movies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderMovieList(bottom3, "Not enough movies rated yet.")}
        </CardContent>
      </Card>
    </div>
  );
};
