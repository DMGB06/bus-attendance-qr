import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Menu, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { formatDayMenuLabel, getTodayDateIso } from "@/src/features/trips/domain/activity-grouping";
import type { ActivityDayOption } from "@/src/features/trips/types/activity.types";

type ActivityDaySelectorProps = {
  options: ActivityDayOption[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

export function ActivityDaySelector({
  options,
  selectedDate,
  onSelectDate,
}: ActivityDaySelectorProps) {
  const { colors, tokens } = useAppTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const todayIso = getTodayDateIso();

  const selectedOption =
    options.find((option) => option.date === selectedDate) ?? options[options.length - 1];

  const menuOptions = useMemo(() => [...options].reverse(), [options]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          paddingHorizontal: tokens.spacing.xl,
        },
        label: {
          ...tokens.typography.label,
          color: colors.textMuted,
          marginBottom: tokens.spacing.xs,
        },
        trigger: {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.md,
          backgroundColor: colors.surfaceListItem,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.md,
        },
        iconWrap: {
          width: 36,
          height: 36,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.primarySoftBg,
          alignItems: "center",
          justifyContent: "center",
        },
        triggerBody: {
          flex: 1,
          gap: 2,
        },
        triggerTitle: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
        },
        triggerSubtitle: {
          ...tokens.typography.caption,
          color: colors.textMuted,
        },
      }),
    [colors, tokens],
  );

  if (!selectedOption) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Día del historial</Text>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Elegir día del historial"
            accessibilityState={{ expanded: menuVisible }}
            onPress={() => setMenuVisible(true)}
            style={styles.trigger}
          >
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.triggerBody}>
              <Text style={styles.triggerTitle}>{selectedOption.label}</Text>
              <Text style={styles.triggerSubtitle}>{selectedOption.detailLabel}</Text>
            </View>
            <MaterialCommunityIcons
              name={menuVisible ? "chevron-up" : "chevron-down"}
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        }
        contentStyle={{
          backgroundColor: colors.surfaceCard,
          borderRadius: tokens.radius.lg,
        }}
      >
        {menuOptions.map((option) => {
          const isSelected = option.date === selectedDate;

          return (
            <Menu.Item
              key={option.date}
              title={formatDayMenuLabel(option.date, todayIso)}
              leadingIcon={isSelected ? "check" : undefined}
              titleStyle={{
                color: isSelected ? colors.primary : colors.textBody,
              }}
              onPress={() => {
                onSelectDate(option.date);
                setMenuVisible(false);
              }}
            />
          );
        })}
      </Menu>
    </View>
  );
}
