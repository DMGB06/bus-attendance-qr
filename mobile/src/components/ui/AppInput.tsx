import { TextInput, TextInputProps } from 'react-native-paper';

export function AppInput(props: TextInputProps) {
    return (
        <TextInput
            mode="outlined"
            autoCapitalize="none"
            {...props}
        />
    );
}

// Expone el subcomponente de Paper
AppInput.Icon = TextInput.Icon;