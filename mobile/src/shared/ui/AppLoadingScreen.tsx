import { StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Text } from 'react-native-paper';
import BusControlLogo from '../../../assets/images/bus_logo.svg';


export function AppLoadingScreen() {
    return (
        <View style={styles.root}>
            {/* Background Gradient */}
            <LinearGradient
                colors={['#0F1115', '#131A24', '#1A1F27']}
                style={StyleSheet.absoluteFill}
            />

            {/* Ambient Glow */}
            <View style={styles.glowBlue} />
            <View style={styles.glowPurple} />

            {/* Center Content */}
            <View style={styles.centerContent}>
                <View style={styles.logoWrapper}>
                    <BusControlLogo width={350} height={350} />
                </View>
                {/* Minimal Loader */}
                <View style={styles.loaderContainer}>
                    <View style={[styles.dot, styles.dot1]} />
                    <View style={[styles.dot, styles.dot2]} />
                    <View style={[styles.dot, styles.dot3]} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: '#0F1115',
    },

    glowBlue: {
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: 'rgba(59,130,246,0.16)',
        top: -120,
        right: -100,
    },

    glowPurple: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(168,85,247,0.10)',
        bottom: -40,
        left: -60,
    },

    centerContent: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },

    logoWrapper: {
        marginBottom: 26,
    },
    loaderContainer: {
        flexDirection: 'row',
        marginTop: 30,
        gap: 10,
    },

    dot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: '#3B82F6',
        opacity: 0.5,
    },

    dot1: {
        opacity: 1,
    },

    dot2: {
        opacity: 0.7,
    },

    dot3: {
        opacity: 0.4,
    },
});