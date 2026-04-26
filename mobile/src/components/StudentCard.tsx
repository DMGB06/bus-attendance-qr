import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';

import type { Student } from '@/src/types';

interface StudentCardProps {
  student: Student;
}

export function StudentCard({ student }: StudentCardProps) {
  return (
    <Card mode="outlined">
      <Card.Title title="Alumno identificado" subtitle={student.nombre_alumno} />
      <Card.Content style={styles.content}>
        <Text variant="bodyMedium">Código: {student.codigo}</Text>
        <Text variant="bodySmall">ID: {student.id}</Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 6,
  },
});
