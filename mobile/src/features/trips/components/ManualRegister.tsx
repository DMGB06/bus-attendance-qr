import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";
import { MANUAL_SEARCH_MIN_CHARS } from "@/src/features/trips/hooks/useStudentAttendance";

type ManualRegisterProps = {
  manualName: string;
  onManualNameChange: (value: string) => void;
  isSearching: boolean;
  isRegistering: boolean;
  onSearch: () => Promise<void>;
};

export function ManualRegister({
  manualName,
  onManualNameChange,
  isSearching,
  isRegistering,
  onSearch,
}: ManualRegisterProps) {
  const { colors, tokens } = useAppTheme();
  const trimmedLength = manualName.trim().length;
  const canSearch = trimmedLength >= MANUAL_SEARCH_MIN_CHARS;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: tokens.spacing.md,
        },
        hint: {
          ...tokens.typography.caption,
          color: colors.textMuted,
          lineHeight: 18,
          paddingHorizontal: tokens.spacing.xs,
        },
        searchButton: {
          borderRadius: tokens.radius.md,
        },
        searchButtonContent: {
          height: tokens.layout.buttonHeight - 4,
        },
        searchButtonLabel: {
          ...tokens.typography.bodyStrong,
          color: colors.textOnPrimary,
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label="Nombre del alumno"
        placeholder="Ej. Ariana Quispe"
        value={manualName}
        onChangeText={onManualNameChange}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!isRegistering}
        disabled={isRegistering}
        returnKeyType="search"
        outlineColor={colors.borderMuted}
        activeOutlineColor={colors.primary}
        textColor={colors.textTitle}
        placeholderTextColor={colors.textMuted}
        style={{ backgroundColor: colors.surfaceCard }}
        onSubmitEditing={() => {
          if (canSearch) {
            void onSearch();
          }
        }}
      />
      {trimmedLength > 0 && !canSearch ? (
        <Text style={styles.hint}>
          Escribe al menos {MANUAL_SEARCH_MIN_CHARS} caracteres y pulsa Buscar.
        </Text>
      ) : null}
      <Button
        mode="contained"
        icon="magnify"
        onPress={() => void onSearch()}
        loading={isSearching}
        disabled={isRegistering || !canSearch}
        buttonColor={colors.primary}
        style={styles.searchButton}
        contentStyle={styles.searchButtonContent}
        labelStyle={styles.searchButtonLabel}
      >
        Buscar por nombre
      </Button>
    </View>
  );
}
