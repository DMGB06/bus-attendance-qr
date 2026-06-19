import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { ActivityEventRow } from "@/src/features/trips/components/ActivityEventRow";
import type { ActivityTripGroup } from "@/src/features/trips/types/activity.types";

type ActivityTripSectionProps = {
  trip: ActivityTripGroup;
};

export function ActivityTripSection({ trip }: ActivityTripSectionProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: tokens.spacing.sm,
        },
        title: {
          ...tokens.typography.bodyStrong,
          color: colors.textTitle,
          paddingHorizontal: tokens.spacing.xl,
        },
        events: {
          gap: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.xl,
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{trip.title}</Text>
      <View style={styles.events}>
        {trip.events.map((event) => (
          <ActivityEventRow key={event.recordId} event={event} />
        ))}
      </View>
    </View>
  );
}
