import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, TextInput } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";

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
        editable={!isSearching && !isRegistering}
        returnKeyType="search"
        onSubmitEditing={() => {
          void onSearch();
        }}
      />
      <Button
        mode="contained"
        onPress={() => void onSearch()}
        loading={isSearching}
        disabled={isRegistering}
      >
        Buscar por nombre
      </Button>
    </View>
  );
}
