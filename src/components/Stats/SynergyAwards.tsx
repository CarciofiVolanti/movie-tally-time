import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Heart, Zap, Split, ChevronDown, ChevronUp } from "lucide-react";

interface RankedPair {
  name: string;
  value: string;
  score: number;
}

interface SynergyAwardsProps {
  stats: {
    perfectMatch: RankedPair[];
    soulmates: RankedPair[];
    polarOpposites: RankedPair[];
  };
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

export const SynergyAwards = ({ stats, expandedId, onToggleExpand }: SynergyAwardsProps) => {
  if (!stats) return null;

  const synergyItems = [
    {
      id: "perfectMatch",
      title: "The Perfect Match",
      description: "Rater who loves Proposer's ideas",
      icon: Heart,
      data: stats.perfectMatch,
      color: "text-pink-500",
      bg: "bg-pink-500/10"
    },
    {
      id: "soulmates",
      title: "Taste Soulmates",
      description: "Closest average ratings",
      icon: Zap,
      data: stats.soulmates,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      id: "polarOpposites",
      title: "Polar Opposites",
      description: "Most different average ratings",
      icon: Split,
      data: stats.polarOpposites,
      color: "text-orange-500",
      bg: "bg-orange-500/10"
    }
  ];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Synergy & Taste Rankings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {synergyItems.map((item) => {
            const list = item.data;
            const winner = list[0];
            // Cap at 15 items total
            const others = list.slice(1, 15);
            const isExpanded = expandedId === item.id;

            return (
              <div key={item.id} className="flex flex-col p-4 rounded-lg bg-card border border-border/50 shadow-sm">
                <div className="flex flex-col items-center text-center mb-4">
                  <div className={`p-3 rounded-full ${item.bg} mb-3`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h3 className="font-semibold text-base">{item.title}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{item.description}</p>
                  
                  {winner ? (
                    <div className="mt-1">
                      <p className="font-bold text-lg text-primary">{winner.name}</p>
                      <p className="text-xs text-muted-foreground">{winner.value}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic mt-2">No data yet</p>
                  )}
                </div>

                {others.length > 0 && (
                  <div className="mt-auto pt-4 border-t border-border/50">
                    <button 
                      onClick={() => onToggleExpand(item.id)}
                      className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>Full Rankings</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    
                    {isExpanded && (
                      <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        {others.map((pair, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-muted-foreground font-mono w-3 flex-shrink-0">{idx + 2}.</span>
                              <span className="font-medium truncate">{pair.name}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 flex-shrink-0">
                              {pair.score.toFixed(1)}
                            </span>
                          </div>
                        ))}
                        {list.length > 15 && (
                          <p className="text-[10px] text-center text-muted-foreground pt-1 opacity-50">Capped at top 15</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
