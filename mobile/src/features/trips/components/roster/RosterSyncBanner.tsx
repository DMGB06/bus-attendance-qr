import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/theme/ThemeProvider';

type RosterSyncBannerProps = {
  isShowingCache: boolean;
  cacheSavedAt: string | null;
  pendingSyncCount: number;
};

function formatCacheAge(savedAt: string | null): string | null {
  if (!savedAt) {
    return null;
  }

  const ageMs = Date.now() - new Date(savedAt).getTime();
  if (ageMs < 60_000) {
    return 'hace un momento';
  }

  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 60) {
    return `hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

export function RosterSyncBanner({
  isShowingCache,
  cacheSavedAt,
  pendingSyncCount,
}: RosterSyncBannerProps) {
  const { colors, tokens } = useAppTheme();
  const cacheAge = formatCacheAge(cacheSavedAt);

  const message = useMemo(() => {
    if (pendingSyncCount > 0) {
      return `${pendingSyncCount} registro(s) pendiente(s) de sincronizar.`;
    }
    if (isShowingCache && cacheAge) {
      return `Sin conexión reciente · mostrando datos guardados ${cacheAge}.`;
    }
    if (isShowingCache) {
      return 'Mostrando datos guardados en el dispositivo.';
    }
    return null;
  }, [cacheAge, isShowingCache, pendingSyncCount]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        banner: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          marginHorizontal: tokens.spacing.lg,
          marginBottom: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          borderRadius: tokens.radius.md,
          backgroundColor: colors.skySoftBg,
          borderWidth: 1,
          borderColor: colors.feedbackWarningBorder,
        },
        text: {
          ...tokens.typography.caption,
          color: colors.feedbackWarningBody,
          flex: 1,
        },
      }),
    [colors, tokens],
  );

  if (!message) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <MaterialCommunityIcons
        name={pendingSyncCount > 0 ? 'cloud-upload-outline' : 'cloud-off-outline'}
        size={16}
        color={colors.feedbackWarningGlyph}
      />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}
