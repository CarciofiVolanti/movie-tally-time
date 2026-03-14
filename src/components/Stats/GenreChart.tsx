import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

interface GenreChartProps {
  data: { name: string; value: number }[];
}

const COLORS = [
  '#0ea5e9', // sky-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#f43f5e', // rose-500
  '#3b82f6', // teal-500
  '#6366f1', // indigo-500
  '#84cc16', // emerald-400
  '#a855f7', // purple-500
];

export const GenreChart = ({ data }: GenreChartProps) => {
  // Take top 8 genres and bundle the rest into "Other"
  let displayData = [...data];
  if (displayData.length > 8) {
    const top = displayData.slice(0, 7);
    const other = displayData.slice(7).reduce((sum, item) => sum + item.value, 0);
    displayData = [...top, { name: "Other", value: other }];
  }

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-primary" />
          Genre Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm italic">
            No genre data available.
          </div>
        ) : (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {displayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
