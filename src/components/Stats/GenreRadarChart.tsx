import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { BarChart3 } from "lucide-react";

interface GenreRadarChartProps {
  data: {
    subject: string;
    hype: number;
    score: number;
    fullMark: number;
  }[];
  title?: string;
}

export const GenreRadarChart = ({ data, title = "Genre Hype vs. Score" }: GenreRadarChartProps) => {
  if (data.length < 3) {
    return (
      <Card className="col-span-full lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground text-sm italic">
          Need at least 3 genres with ratings to show chart.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 10]} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8 }}
              />
              <Radar
                name="Pre-Watch Hype (Norm. 0-10)"
                dataKey="hype"
                stroke="#f97316"
                fill="#f97316"
                fillOpacity={0.4}
              />
              <Radar
                name="Post-Watch Score (0-10)"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.4}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
