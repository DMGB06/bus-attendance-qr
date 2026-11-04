import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

export type HeaderStat = {
  key: string;
  value: number;
  label: string;
  active?: boolean;
  onPress?: () => void;
};

/** Contadores dentro de la cabecera. Con onPress funcionan como filtro. */
export function HeaderStats({ items }: { items: HeaderStat[] }) {
  const { colors, tokens } = useAppTheme();

  return (
    <View style={[styles.row, { gap: tokens.spacing.xs }]}>
      {items.map((item) => {
        const body = (
          <>
            <Text style={[tokens.typography.title1, { color: colors.onHeader }]}>{item.value}</Text>
            <Text
              numberOfLines={1}
              style={[tokens.typography.caption, { color: colors.onHeaderMuted }]}
            >
              {item.label}
            </Text>
          </>
        );
        const cellStyle = [
          styles.cell,
          { borderRadius: tokens.radius.md, paddingVertical: tokens.spacing.xs },
          item.active ? { backgroundColor: colors.headerStatBg } : null,
        ];

        return item.onPress ? (
          <Pressable
            key={item.key}
            style={cellStyle}
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: Boolean(item.active) }}
            accessibilityLabel={`${item.label}: ${item.value}`}
          >
            {body}
          </Pressable>
        ) : (
          <View key={item.key} style={cellStyle}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
});
