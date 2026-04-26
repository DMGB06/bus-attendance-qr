import { Button, ButtonProps } from 'react-native-paper'

export function AppButton(props: ButtonProps) {
    return (
        <Button
            mode="contained"
            style={{ borderRadius: 12, paddingVertical: 6 }}
            {...props}
        />
    )
}