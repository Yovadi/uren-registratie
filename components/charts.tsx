import { StyleSheet, View } from 'react-native';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/Themed';
import { Brand } from '@/constants/Colors';
import type { NamedValue } from '@/domain';

/** Angle 0 = top, increasing clockwise (screen coords). */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Filled annular sector — proportions match values reliably (unlike stroked arcs). */
function donutSlicePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
) {
  const sweep = Math.max(0, Math.min(359.999, endAngle - startAngle));
  if (sweep <= 0) return '';
  const end = startAngle + sweep;
  const p0 = polar(cx, cy, rOuter, startAngle);
  const p1 = polar(cx, cy, rOuter, end);
  const p2 = polar(cx, cy, rInner, end);
  const p3 = polar(cx, cy, rInner, startAngle);
  const large = sweep > 180 ? 1 : 0;
  return [
    `M ${p0.x} ${p0.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${p3.x} ${p3.y}`,
    'Z',
  ].join(' ');
}

function formatValue(n: number): string {
  return Number.isInteger(n)
    ? String(n)
    : n.toLocaleString('nl-NL', { maximumFractionDigits: 1 });
}

export function DonutChart({
  data,
  size = 180,
  thickness = 32,
  centerSuffix = '',
}: {
  data: NamedValue[];
  size?: number;
  thickness?: number;
  /** Shown after the center total, e.g. "u", "nachten", "€" */
  centerSuffix?: string;
}) {
  const positive = data.filter((d) => d.value > 0);
  const total = positive.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 2;
  const rInner = Math.max(8, rOuter - thickness);

  let angle = 0;
  const slices = positive.map((d, i) => {
    const sweep = total > 0 ? (d.value / total) * 360 : 0;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return {
      ...d,
      start,
      end,
      pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
      color: Brand.chart[i % Brand.chart.length],
    };
  });

  const centerLabel =
    centerSuffix === '€'
      ? `€${Math.round(total)}`
      : `${formatValue(total)}${centerSuffix ? ` ${centerSuffix}` : ''}`;

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size}>
        {total <= 0 ? (
          <Path
            d={donutSlicePath(cx, cy, rOuter, rInner, 0, 359.999)}
            fill="#E6EDF3"
          />
        ) : (
          slices.map((s) => (
            <Path
              key={s.name}
              d={donutSlicePath(cx, cy, rOuter, rInner, s.start, s.end)}
              fill={s.color}
            />
          ))
        )}
        <SvgText
          x={cx}
          y={cy + 5}
          fill={Brand.text}
          fontSize="13"
          fontWeight="700"
          textAnchor="middle">
          {centerLabel}
        </SvgText>
      </Svg>
      <View style={styles.legend}>
        {(total <= 0
          ? data.map((d, i) => ({
              name: d.name,
              value: d.value,
              pct: 0,
              color: Brand.chart[i % Brand.chart.length],
            }))
          : slices
        ).map((s) => (
          <View key={s.name} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>
              {s.name}: {formatValue(s.value)}
              {s.pct ? ` (${s.pct}%)` : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function BarChart({
  data,
  height = 180,
  horizontal = false,
}: {
  data: NamedValue[];
  height?: number;
  horizontal?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const width = Math.max(280, data.length * 36);

  if (horizontal) {
    return (
      <View style={{ gap: 8 }}>
        {data.map((d, i) => (
          <View key={d.name} style={styles.hRow}>
            <Text style={styles.hLabel} numberOfLines={1}>
              {d.name}
            </Text>
            <View style={styles.hTrack}>
              <View
                style={{
                  width: `${(d.value / max) * 100}%`,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: Brand.chart[i % Brand.chart.length],
                }}
              />
            </View>
            <Text style={styles.hVal}>{formatValue(d.value)}</Text>
          </View>
        ))}
      </View>
    );
  }

  const barW = 22;
  const gap = 12;
  const chartH = height - 28;
  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const h = (d.value / max) * chartH;
        const x = 8 + i * (barW + gap);
        const y = chartH - h + 4;
        return (
          <G key={d.name}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 1)}
              rx={4}
              fill={Brand.chart[i % Brand.chart.length]}
            />
            <SvgText
              x={x + barW / 2}
              y={height - 6}
              fill={Brand.textMuted}
              fontSize="9"
              textAnchor="middle">
              {d.name.slice(0, 3)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  donutWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
  legend: { gap: 6, flexShrink: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13 },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hLabel: { width: 110, fontSize: 12 },
  hTrack: { flex: 1, height: 14, backgroundColor: '#E6EDF3', borderRadius: 7 },
  hVal: { width: 48, fontSize: 12, textAlign: 'right' },
});
