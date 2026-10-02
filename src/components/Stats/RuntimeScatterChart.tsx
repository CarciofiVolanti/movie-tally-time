import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Clock } from "lucide-react";

interface RuntimeScatterChartProps {
  data: {
    runtime: number; // x axis
    score: number;   // y axis
    title: string;
  }[];
  title?: string;
  preferenceText?: string;
  isHype?: boolean;
}

export const RuntimeScatterChart = ({ data, title = "Runtime vs Rating", preferenceText, isHype = false }: RuntimeScatterChartProps) => {
  if (data.length < 3) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground text-sm italic">
          Need at least 3 rated movies with known runtimes to show chart.
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-card border border-border p-2 rounded-lg shadow-md text-sm z-50">
          <p className="font-bold">{point.title}</p>
          <p className="text-muted-foreground">Runtime: {point.runtime} mins</p>
          <p className="text-muted-foreground">{isHype ? 'Hype' : 'Score'}: {point.score} / {isHype ? '5' : '10'}</p>
        </div>
      );
    }
    return null;
  };

  const color = isHype ? "#f97316" : "hsl(var(--primary))";

  // Calculate Linear Regression for Trendline
  let slope = 0;
  let intercept = 0;
  let showTrendline = false;
  let minX = 0;
  let maxX = 0;

  if (data.length >= 2) {
    const n = data.length;
    const sumX = data.reduce((acc, val) => acc + val.runtime, 0);
    const sumY = data.reduce((acc, val) => acc + val.score, 0);
    const sumXY = data.reduce((acc, val) => acc + val.runtime * val.score, 0);
    const sumX2 = data.reduce((acc, val) => acc + val.runtime * val.runtime, 0);

    const denominator = n * sumX2 - sumX * sumX;
    
    if (denominator !== 0) {
      slope = (n * sumXY - sumX * sumY) / denominator;
      intercept = (sumY - slope * sumX) / n;
      showTrendline = true;
      minX = Math.min(...data.map(d => d.runtime));
      maxX = Math.max(...data.map(d => d.runtime));
    }
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color }} />
            {title}
          </div>
          {preferenceText && preferenceText !== "Not enough data" && preferenceText !== "No strong preference" && (
            <span 
              className="text-xs font-normal px-2 py-1 rounded-full border" 
              style={{ color, borderColor: color, backgroundColor: isHype ? 'rgba(249,115,22,0.1)' : 'rgba(var(--primary), 0.1)' }}
            >
              {preferenceText}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                dataKey="runtime" 
                name="Runtime" 
                unit="m" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <YAxis 
                type="number" 
                dataKey="score" 
                name={isHype ? "Hype" : "Rating"} 
                domain={[0, isHype ? 5 : 10]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              {showTrendline && (
                <ReferenceLine 
                  segment={[{ x: minX, y: slope * minX + intercept }, { x: maxX, y: slope * maxX + intercept }]} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4"
                  opacity={0.8}
                  strokeWidth={2}
                />
              )}
              <Scatter name="Movies" data={data} fill={color} opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
