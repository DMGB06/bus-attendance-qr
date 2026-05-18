import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { Student } from '@/src/features/trips/types';
import { useAppTheme } from '@/src/core/theme/ThemeProvider';

interface StudentCardProps {
  student: Student;
  statusLabel?: string;
}

function formatValue(value: string | null | undefined) {
  return value?.trim() ? value : 'No registrado';
}

export function StudentCard({ student }: StudentCardProps) {
  const { colors } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surfaceCard,
          borderRadius: 26,
          padding: 18,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          shadowColor: colors.shadowColor,
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 6,
        },
        infoContainer: {
          gap: 14,
        },
        infoRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
        },
        infoText: {
          flex: 1,
          color: colors.textBody,
          fontSize: 14,
          lineHeight: 22,
        },
      }),
    [colors],
  );

  return (
    <Surface style={styles.card}>
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="school-outline" size={18} color={colors.primarySoftText} />
          <Text style={styles.infoText}>Colegio: {formatValue(student.colegio)}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="account-heart-outline" size={18} color={colors.primarySoftText} />
          <Text style={styles.infoText}>Apoderado: {formatValue(student.nombre_apoderado)}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="phone-outline" size={18} color={colors.primarySoftText} />
          <Text style={styles.infoText}>Teléfono: {formatValue(student.telefono_apoderado)}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.primarySoftText} />
          <Text style={styles.infoText}>Dirección: {formatValue(student.direccion)}</Text>
        </View>
      </View>
    </Surface>
  );
}
