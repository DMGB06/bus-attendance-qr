import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, HelperText, TextInput } from "react-native-paper";

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
  const { tokens } = useAppTheme();
  const trimmedLength = manualName.trim().length;
  const canSearch = trimmedLength >= MANUAL_SEARCH_MIN_CHARS;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: tokens.spacing.md,
        },
      }),
    [tokens.spacing.md],
  );

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label="Nombre del alumno"
        value={manualName}
        onChangeText={onManualNameChange}
        autoCapitalize="words"
        autoCorrect={false}
        editable={!isRegistering}
        disabled={isRegistering}
        returnKeyType="search"
        onSubmitEditing={() => {
          if (canSearch) {
            void onSearch();
          }
        }}
      />
      <HelperText type="info" visible={trimmedLength > 0 && !canSearch}>
        Escribe al menos {MANUAL_SEARCH_MIN_CHARS} caracteres y pulsa Buscar por nombre.
      </HelperText>
      <Button
        mode="contained"
        onPress={() => void onSearch()}
        loading={isSearching}
        disabled={isRegistering || !canSearch}
      >
        Buscar por nombre
      </Button>
    </View>
  );
}
