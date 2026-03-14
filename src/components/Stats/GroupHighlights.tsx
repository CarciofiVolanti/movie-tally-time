import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Frown, AlertCircle } from "lucide-react";

interface GroupHighlight {
  title: string;
  avgHype: number;
  avgScore: number;
  diff: number;
}

interface GroupHighlightsProps {
  surprise: GroupHighlight | null;
  disappointment: GroupHighlight | null;
}

export const GroupHighlights = ({ surprise, disappointment }: GroupHighlightsProps) => {
  if (!surprise && !disappointment) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-full">
      {surprise && (
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
              <Sparkles className="w-5 h-5" />
              The Group's Biggest Surprise
              <AlertCircle className="w-4 h-4 opacity-50" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xl font-bold">{surprise.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  The movie we weren't expecting much from, but we all loved!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20 text-center">
                  <p className="text-[10px] uppercase font-bold text-orange-600">Group Hype</p>
                  <p className="text-lg font-bold">{surprise.avgHype.toFixed(1)}/5</p>
                </div>
                <div className="p-2 rounded bg-primary/10 border border-primary/20 text-center">
                  <p className="text-[10px] uppercase font-bold text-primary">Group Rating</p>
                  <p className="text-lg font-bold">{surprise.avgScore.toFixed(1)}/10</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {disappointment && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <Frown className="w-5 h-5" />
              The Group's Biggest Disappointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xl font-bold">{disappointment.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  We were all so hyped, but it just didn't deliver.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20 text-center">
                  <p className="text-[10px] uppercase font-bold text-orange-600">Group Hype</p>
                  <p className="text-lg font-bold">{disappointment.avgHype.toFixed(1)}/5</p>
                </div>
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-center">
                  <p className="text-[10px] uppercase font-bold text-red-600">Group Rating</p>
                  <p className="text-lg font-bold">{disappointment.avgScore.toFixed(1)}/10</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
