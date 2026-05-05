import { Image, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

export function AppLoadingScreen() {
    return (
        <View style={styles.root}>
            <View style={styles.topShape} />
            <View style={styles.bottomShape} />

            <View style={styles.centerCard}>
                <Image source={require('../../assets/images/splash-icon.png')} style={styles.logo} resizeMode="contain" />
                <Text style={styles.title}>BUSCONTROL QR</Text>
                <Text style={styles.subtitle}>Registro de asistencia escolar</Text>
                <ActivityIndicator size="small" color="#2f5de0" style={styles.loader} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#f4f6fa',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    topShape: {
        position: 'absolute',
        top: -120,
        width: 420,
        height: 240,
        backgroundColor: '#3d63f0',
        transform: [{ rotate: '-12deg' }],
    },
    bottomShape: {
        position: 'absolute',
        bottom: -130,
        width: 430,
        height: 250,
        backgroundColor: '#3d63f0',
        transform: [{ rotate: '14deg' }],
    },
    centerCard: {
        width: '84%',
        maxWidth: 340,
        borderRadius: 24,
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 20,
        backgroundColor: '#ffffff',
        shadowColor: '#0f172a',
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
    },
    logo: {
        width: 88,
        height: 88,
        marginBottom: 12,
    },
    title: {
        fontSize: 23,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#111827',
        textAlign: 'center',
    },
    subtitle: {
        marginTop: 6,
        fontSize: 13,
        color: '#4b5563',
        textAlign: 'center',
    },
    loader: {
        marginTop: 16,
    },
});