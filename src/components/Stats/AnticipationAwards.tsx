import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Glasses, Flame, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface RankedItem {
  name: string;
  value: string;
  score: number;
  sampleCount: number;
  sampleUnit: string;
}

interface AnticipationAwardsProps {
  stats: {
    hypeMan: RankedItem[];
    skeptic: RankedItem[];
    mostAnticipated: RankedItem[];
  };
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

export const AnticipationAwards = ({ stats, expandedId, onToggleExpand }: AnticipationAwardsProps) => {
  if (!stats) return null;

  const anticipationItems = [
    {
      id: "hypeMan",
      title: "Premio essere Ste",
      description: "Highest average pre-watch ratings",
      sampleShownInValue: false,
      icon: Flame,
      data: stats.hypeMan,
      color: "text-orange-600",
      bg: "bg-orange-600/10"
    },
    {
      id: "skeptic",
      title: "Sisi gli ho messo 5 stelle",
      description: "Lowest average pre-watch ratings",
      sampleShownInValue: false,
      icon: Glasses,
      data: stats.skeptic,
      color: "text-cyan-600",
      bg: "bg-cyan-600/10"
    },
    {
      id: "mostAnticipated",
      title: "Stasera Prisoners?",
      description: "Highest average hype for a movie",
      sampleShownInValue: true,
      icon: Sparkles,
      data: stats.mostAnticipated,
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    }
  ];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Anticipation (Hype) & Rankings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {anticipationItems.map((item) => {
            const list = item.data;
            
            // Logic for winner and others based on category
            const winner = list[0];
            const othersFull = list.slice(1);
            
            // Cap at 15 items total
            const others = othersFull.slice(0, 14);
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
                      <p className="font-bold text-lg text-primary truncate max-w-[180px]">{winner.name}</p>
                      <p className="text-xs text-muted-foreground">{winner.value}</p>
                      {!item.sampleShownInValue && (
                        <p className="mt-1 text-[10px] text-muted-foreground">Based on {winner.sampleCount} {winner.sampleUnit}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic mt-2">No data yet</p>
                  )}
                </div>

                {othersFull.length > 0 && (
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
                        {others.map((person, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="flex min-w-0 items-start gap-2">
                              <span className="text-muted-foreground font-mono w-3 flex-shrink-0">{idx + 2}.</span>
                              <span className="min-w-0">
                                <span className="block font-medium truncate">{person.name}</span>
                                <span className="block text-[10px] text-muted-foreground">n={person.sampleCount} {person.sampleUnit}</span>
                              </span>
                            </span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 flex-shrink-0">
                              {person.score.toFixed(1)}
                            </span>
                          </div>
                        ))}
                        {othersFull.length > 14 && (
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
