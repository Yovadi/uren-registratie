import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { Brand } from '@/constants/Colors';

export function useTheme() {
  return Colors[useColorScheme()];
}

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>Hotraco / Speria</Text>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
    </View>
  );
}

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }, style]}>{children}</View>
  );
}

export function Content({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        style,
      ]}>
      {children}
    </View>
  );
}

export function KpiTile({
  label,
  value,
  icon,
  tone = 'primary',
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'primary' | 'secondary' | 'accent';
}) {
  const theme = useTheme();
  const color =
    tone === 'secondary' ? Brand.secondary : tone === 'accent' ? Brand.accent : Brand.primary;
  return (
    <View
      style={[
        styles.kpi,
        { borderColor: theme.border, backgroundColor: theme.surface },
      ]}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryBtn,
        { opacity: disabled ? 0.55 : pressed ? 0.9 : 1 },
      ]}>
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={[styles.label, { color: theme.textMuted }]}>{children}</Text>;
}

export function FieldInput(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textMuted}
      {...props}
      style={[
        styles.input,
        {
          color: theme.text,
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        props.style,
      ]}
    />
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? Brand.primary : theme.surface,
          borderColor: selected ? Brand.primary : theme.border,
        },
      ]}>
      <Text style={{ color: selected ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Brand.header,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 18 : 12,
    paddingBottom: 16,
    gap: 2,
  },
  brand: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: Brand.headerText,
    fontSize: 22,
    fontWeight: '700',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  screen: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 1100 : undefined,
    alignSelf: 'center',
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  kpi: {
    flexGrow: 1,
    flexBasis: Platform.OS === 'web' ? 160 : '46%',
    minWidth: Platform.OS === 'web' ? 150 : '46%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: { fontSize: 12, fontWeight: '600' },
  kpiValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  primaryBtn: {
    marginTop: 10,
    backgroundColor: Brand.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 11 : 10,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
});
