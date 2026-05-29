"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function OverviewCharts({
  registrations,
  topResources
}: {
  registrations: { date: string; count: number }[];
  topResources: { title: string; download_count: number }[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="glass-panel p-6">
        <h2 className="font-display text-2xl font-semibold">Registrations (30 days)</h2>
        <div className="mt-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={registrations}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#1B4F72" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="glass-panel p-6">
        <h2 className="font-display text-2xl font-semibold">Top downloads</h2>
        <div className="mt-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topResources} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="title" width={150} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="download_count" fill="#2E86C1" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}