import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/Themed';
import { Brand } from '@/constants/Colors';
import type { NamedValue } from '@/domain';

function polar(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

export function DonutChart({
  data,
  size = 180,
  thickness = 28,
}: {
  data: NamedValue[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  let angle = 0;
  const slices = data.map((d, i) => {
    const sweep = (d.value / total) * 360;
    const start = angle;
    const end = angle + Math.max(sweep, d.value > 0 ? 0.5 : 0);
    angle = end;
    return { ...d, start, end, color: Brand.chart[i % Brand.chart.length] };
  });

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke="#E6EDF3" strokeWidth={thickness} fill="none" />
        {slices.map((s) =>
          s.value <= 0 ? null : (
            <Path
              key={s.name}
              d={arcPath(cx, cy, r, s.start, s.end)}
              stroke={s.color}
              strokeWidth={thickness}
              fill="none"
              strokeLinecap="butt"
            />
          ),
        )}
        <SvgText
          x={cx}
          y={cy + 4}
          fill={Brand.text}
          fontSize="14"
          fontWeight="700"
          textAnchor="middle">
          {Math.round(total)} u
        </SvgText>
      </Svg>
      <View style={styles.legend}>
        {slices.map((s) => (
          <View key={s.name} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>
              {s.name}: {s.value}
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
            <Text style={styles.hVal}>{d.value}</Text>
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
  hLabel: { width: 100, fontSize: 12 },
  hTrack: { flex: 1, height: 14, backgroundColor: '#E6EDF3', borderRadius: 7 },
  hVal: { width: 44, fontSize: 12, textAlign: 'right' },
});
