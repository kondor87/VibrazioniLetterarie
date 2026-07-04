"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { GENRE_COLORS } from "@/types/book";

// ── Stile comune assi/tooltip ────────────────────────────────────────────────
const axisStyle = { fill: "#8A6040", fontSize: 11, fontFamily: "var(--font-ui)" };
const gridStyle = { stroke: "rgba(61,37,16,0.3)", strokeDasharray: "3 3" };

function ChartTooltip({ active, payload, label, unit = "" }: {
  active?: boolean; payload?: { value: number; name?: string; fill?: string }[]; label?: string; unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-gold/20 rounded-lg px-3 py-2 shadow-panel text-xs font-ui">
      {label && <p className="text-text-muted mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || "#C89010" }}>
          {p.name ? `${p.name}: ` : ""}<span className="font-mono font-medium">{p.value}{unit}</span>
        </p>
      ))}
    </div>
  );
}

// ── Libri per anno ──────────────────────────────────────────────────────────
interface YearData { year: string; libri: number; pagine: number }

export function BooksPerYearChart({ data }: { data: YearData[] }) {
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer>
        <BarChart data={data} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip unit=" libri" />} cursor={{ fill: "rgba(200,144,16,0.06)" }} />
          <Bar dataKey="libri" fill="#C89010" radius={[4, 4, 0, 0]}
            label={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Pagine per mese ─────────────────────────────────────────────────────────
interface MonthData { month: string; pagine: number }

export function PagesPerMonthChart({ data }: { data: MonthData[] }) {
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="pagesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C89010" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#C89010" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip unit=" pag." />} cursor={{ stroke: "rgba(200,144,16,0.2)", strokeWidth: 1 }} />
          <Area
            type="monotone" dataKey="pagine" stroke="#C89010" strokeWidth={2}
            fill="url(#pagesGrad)" dot={false} activeDot={{ r: 4, fill: "#E8B040", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Generi (donut) ──────────────────────────────────────────────────────────
interface GenreData { name: string; count: number; color: string }

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number;
}) {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={10} fontFamily="var(--font-ui)" fontWeight={500} opacity={0.85}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function GenreDonutChart({ data }: { data: GenreData[] }) {
  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%"
            innerRadius={55} outerRadius={85}
            dataKey="count" nameKey="name"
            labelLine={false} label={CustomLabel}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color || GENRE_COLORS[entry.name] || "#5A5A5A"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, name: string) => [`${v} libri`, name]}
            contentStyle={{
              background: "#231508", border: "1px solid rgba(200,144,16,0.2)",
              borderRadius: 8, fontFamily: "var(--font-ui)", fontSize: 12,
            }}
            labelStyle={{ color: "#B08860" }}
            itemStyle={{ color: "#F5E6C8" }}
          />
          <Legend
            iconType="circle" iconSize={8}
            formatter={(value) => (
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "#B08860" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Velocità lettura (sparkline) ────────────────────────────────────────────
export function ReadingSpeedSparkline({ data }: { data: { month: string; speed: number }[] }) {
  return (
    <div className="w-full h-[60px]">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E8B040" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#E8B040" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip content={<ChartTooltip unit=" p/g" />} />
          <Area type="monotone" dataKey="speed" stroke="#E8B040" strokeWidth={1.5}
            fill="url(#speedGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
