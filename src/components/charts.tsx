"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";

type Series = { key: "income" | "expense"; label: string; values: number[] };

const SERIES_COLOR = { income: "var(--income)", expense: "var(--expense)" };

const MARGIN = { top: 8, right: 8, bottom: 28, left: 72 };
const MAX_BAR = 24;
const BAR_GAP = 2;
const TOOLTIP_WIDTH = 176;

/** 0 → 1,000 → 2,000: a round step giving about four gridlines. */
function niceTicks(max: number) {
  if (max <= 0) return [0];
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** Bar with a 4px rounded end at the top and a square foot on the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Grouped columns: one group per period, one column per series.
 * Hover or focus a period for its figures; the table view lists them all.
 */
export function ColumnChart({
  label,
  categories,
  series,
  plotHeight = 220,
}: {
  label: string;
  categories: string[];
  series: Series[];
  plotHeight?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const ticks = niceTicks(Math.max(0, ...series.flatMap((s) => s.values)));
  const top = ticks.at(-1) || 1;
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const band = categories.length ? plotWidth / categories.length : 0;
  const barWidth = Math.max(2, Math.min(MAX_BAR, (band * 0.7 - BAR_GAP * (series.length - 1)) / series.length));
  const groupWidth = barWidth * series.length + BAR_GAP * (series.length - 1);
  const y = (v: number) => MARGIN.top + plotHeight - (v / top) * plotHeight;
  const height = MARGIN.top + plotHeight + MARGIN.bottom;

  return (
    <figure>
      <figcaption className="mb-3 flex flex-wrap gap-4 text-sm text-ink-secondary">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: SERIES_COLOR[s.key] }} />
            {s.label}
          </span>
        ))}
      </figcaption>
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={label} className="overflow-visible">
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? "var(--line-strong)" : "var(--line)"}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text x={MARGIN.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-muted text-[11px] tabular">
                  {t.toLocaleString("en-US")}
                </text>
              </g>
            ))}
            {categories.map((category, i) => {
              const x0 = MARGIN.left + band * i;
              const summary = series.map((s) => `${s.label} ${formatMoney(s.values[i])}`).join(", ");
              return (
                <g
                  key={category}
                  tabIndex={0}
                  role="img"
                  aria-label={`${category}: ${summary}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="outline-none"
                >
                  {/* The whole period band is the hover target, not just the thin bars. */}
                  <rect
                    x={x0}
                    y={MARGIN.top}
                    width={band}
                    height={plotHeight}
                    fill={active === i ? "var(--surface-muted)" : "transparent"}
                  />
                  {series.map((s, k) => {
                    const v = s.values[i];
                    if (!v) return null;
                    const x = x0 + (band - groupWidth) / 2 + k * (barWidth + BAR_GAP);
                    return <path key={s.key} d={barPath(x, y(v), barWidth, y(0) - y(v))} fill={SERIES_COLOR[s.key]} />;
                  })}
                  <text
                    x={x0 + band / 2}
                    y={MARGIN.top + plotHeight + 18}
                    textAnchor="middle"
                    className="fill-ink-muted text-[11px]"
                  >
                    {category}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        {active !== null && width > 0 && (
          <Tooltip
            // Beside the hovered period (right of it, or left near the edge) so it never covers the bars.
            left={
              MARGIN.left + band * (active + 1) + 8 + TOOLTIP_WIDTH <= width
                ? MARGIN.left + band * (active + 1) + 8
                : Math.max(0, MARGIN.left + band * active - 8 - TOOLTIP_WIDTH)
            }
            title={categories[active]}
            rows={series.map((s) => ({ key: s.key, label: s.label, value: s.values[active] }))}
          />
        )}
      </div>
    </figure>
  );
}

function Tooltip({
  left,
  title,
  rows,
}: {
  left: number;
  title: string;
  rows: { key: Series["key"]; label: string; value: number }[];
}) {
  const net = rows.reduce((s, r) => s + (r.key === "income" ? r.value : -r.value), 0);
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 rounded-md border border-line bg-surface p-2 text-xs shadow-lg"
      style={{ left, width: TOOLTIP_WIDTH }}
    >
      <p className="mb-1 font-medium text-ink-secondary">{title}</p>
      {rows.map((r) => (
        <p key={r.key} className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-3 rounded" style={{ background: SERIES_COLOR[r.key] }} />
          <span className="font-semibold text-ink tabular">{formatMoney(r.value)}</span>
          <span className="text-ink-muted">{r.label}</span>
        </p>
      ))}
      <p className="mt-1 border-t border-line pt-1">
        <span className="font-semibold text-ink tabular">{formatMoney(net)}</span>{" "}
        <span className="text-ink-muted">net</span>
      </p>
    </div>
  );
}
