"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";

import { cn } from "../../lib/utils";

const Chart = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("", className)} {...props} />;
});
Chart.displayName = "Chart";

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ResponsiveContainer> & {
    config?: Record<string, any>;
    children: React.ComponentProps<typeof ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex aspect-video justify-center text-xs", className)}
    >
      <ResponsiveContainer width="100%" height="100%" {...props}>
        {children}
      </ResponsiveContainer>
    </div>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<any>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-background p-2 shadow-md", className)}
      {...props}
    />
  );
});
ChartTooltip.displayName = "ChartTooltip";

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<any> & {
    active?: boolean;
    payload?: Array<{
      name?: string;
      value?: any;
      color?: string;
      dataKey?: string;
    }>;
    label?: string;
    hideLabel?: boolean;
    nameKey?: string;
  }
>(({ active, payload, label, hideLabel, nameKey, ...props }, ref) => {
  if (active && payload && payload.length) {
    return (
      <div ref={ref} className="grid gap-2" {...props}>
        {!hideLabel && label && <div className="font-medium">{label}</div>}
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.name || entry.dataKey}:</span>
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
});
ChartTooltipContent.displayName = "ChartTooltipContent";

export { Chart, ChartContainer, ChartTooltip, ChartTooltipContent };
