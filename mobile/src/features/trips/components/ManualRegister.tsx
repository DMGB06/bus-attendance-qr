import { useMemo } from 'react';
import { View } from 'react-native';
import { Button, TextInput, Text, HelperText } from 'react-native-paper';
import type { Student } from '@/src/features/trips/types';
import { useAppTheme } from '@/src/core/theme/ThemeProvider';

interface ManualRegisterProps {
    manualName: string;
    setManualName: (value: string) => void;
    manualCandidates: Student[];
    isSearching: boolean;
    isRegistering: boolean;
    errorMessage?: string | null;
    infoMessage?: string | null;
    onSearch: () => Promise<void>;
    onSelectCandidate: (s: Student) => void;
}

export function ManualRegister({
    manualName,
    setManualName,
    manualCandidates,
    isSearching,
    isRegistering,
    errorMessage,
    infoMessage,
    onSearch,
    onSelectCandidate,
}: ManualRegisterProps) {
    const { colors, tokens } = useAppTheme();

    const styles = useMemo(
        () => ({
            manualBlock: {
                gap: 14,
            },
            matchesBlock: {
                gap: 12,
                backgroundColor: colors.scannerMatchContainerBg,
                borderRadius: 22,
                padding: 12,
            },
            matchItem: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                backgroundColor: colors.scannerMatchItemBg,
                borderRadius: 20,
                padding: 14,
            },
            matchTextBlock: {
                flex: 1,
                gap: 4,
            },
            matchName: {
                color: colors.textTitle,
                fontSize: tokens.fontSize.lg,
                fontWeight: '700',
            },
            matchMeta: {
                color: colors.textMuted,
                fontSize: tokens.fontSize.md,
            },
        }),
        [colors, tokens],
    );

    return (
        <View>
            <View style={styles.manualBlock as any}>
                <TextInput
                    mode="outlined"
                    label="Nombre del alumno"
                    value={manualName}
                    onChangeText={(value) => setManualName(value)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isSearching && !isRegistering}
                    returnKeyType="search"
                    onSubmitEditing={() => {
                        void onSearch();
                    }}
                />
                <Button mode="contained" onPress={() => void onSearch()} loading={isSearching} disabled={isRegistering}>
                    Buscar por nombre
                </Button>
            </View>

            {manualCandidates.length > 1 ? (
                <View style={styles.matchesBlock as any}>
                    {manualCandidates.map((candidate) => (
                        <View key={candidate.id} style={styles.matchItem as any}>
                            <View style={styles.matchTextBlock as any}>
                                <Text style={styles.matchName as any}>{candidate.nombre_alumno}</Text>
                                <Text style={styles.matchMeta as any}>DNI: {candidate.dni_alumno}</Text>
                            </View>
                            <Button mode="contained-tonal" compact onPress={() => onSelectCandidate(candidate)}>
                                Elegir
                            </Button>
                        </View>
                    ))}
                </View>
            ) : null}

            {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}
            {infoMessage ? <HelperText type="info">{infoMessage}</HelperText> : null}
        </View>
    );
}
