import { Tabs, useRouter } from 'expo-router';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Text } from 'react-native-paper';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logout } from '@/src/features/auth/services/auth.service';

import {
  colors,
  fontSize,
  spacing,
} from '@/src/core/theme/theme';

export default function TabsLayout() {
  const router = useRouter();

  const insets = useSafeAreaInsets();

  async function handleLogout() {
    await logout();

    router.replace('/(auth)/login');
  }

  return (
    <Tabs
      initialRouteName="trip"
      screenOptions={{
        sceneStyle: {
          backgroundColor: '#0B1020',
        },

        headerShadowVisible: false,

        headerStyle: {
          backgroundColor: '#0B1020',
        },

        headerBackground: () => (
          <LinearGradient
            colors={[
              '#0B1020',
              '#111827',
            ]}
            style={StyleSheet.absoluteFill}
          />
        ),

        headerLeft: () => (
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons
                name="bus-school"
                size={18}
                color="#BFDBFE"
              />
            </View>

            <View>
              <Text style={styles.headerTitle}>
                Bus Attendance
              </Text>

              <Text style={styles.headerSubtitle}>
                Transporte Inteligente
              </Text>
            </View>
          </View>
        ),

        headerRight: () => (
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.headerRight}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="logout"
              size={18}
              color="#94A3B8"
            />

            <Text style={styles.logoutText}>
              Salir
            </Text>
          </TouchableOpacity>
        ),

        headerTitle: () => null,

        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: '#3B82F6',

        tabBarInactiveTintColor: '#7C8AA5',

        tabBarStyle: {
          position: 'absolute',

          backgroundColor:
            'rgba(11,16,32,0.96)',

          borderTopWidth: 1,

          borderTopColor:
            'rgba(255,255,255,0.05)',

          height: 60 + insets.bottom,

          paddingTop: 6,

          paddingBottom: insets.bottom,

          elevation: 0,
        },

        tabBarLabelStyle: {
          fontSize: 11,

          fontWeight: '700',

          letterSpacing: 0.8,

          marginTop: -2,
        },

        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="trip"
        options={{
          title: 'Iniciar Viaje',

          tabBarLabel: 'VIAJE',

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <View
              style={[
                styles.tabIconContainer,

                focused &&
                styles.tabIconContainerActive,
              ]}
            >
              <MaterialCommunityIcons
                name="bus-clock"
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Escanear QR',

          tabBarLabel: 'SCAN',

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <View
              style={[
                styles.tabIconContainer,

                focused &&
                styles.tabIconContainerActive,
              ]}
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="roster"
        options={{
          title: 'Lista',

          tabBarLabel: 'LISTA',

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <View
              style={[
                styles.tabIconContainer,

                focused &&
                styles.tabIconContainerActive,
              ]}
            >
              <MaterialCommunityIcons
                name="format-list-bulleted"
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="close-trip"
        options={{
          href: null,

          title: 'Cerrar viaje',

          tabBarStyle: {
            display: 'none',
          },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,

    paddingLeft: spacing.lg,
  },

  logoContainer: {
    width: 38,
    height: 38,

    borderRadius: 19,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor:
      'rgba(59,130,246,0.14)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.06)',
  },

  headerTitle: {
    color: '#EAF1FF',

    fontWeight: '800',

    fontSize: 17,

    letterSpacing: 0.3,
  },

  headerSubtitle: {
    color: '#7C8AA5',

    fontSize: 11,

    marginTop: -1,
  },

  headerRight: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,

    marginRight: spacing.lg,

    paddingHorizontal: 12,

    paddingVertical: 8,

    borderRadius: 14,

    backgroundColor:
      'rgba(255,255,255,0.04)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.05)',
  },

  logoutText: {
    color: '#94A3B8',

    fontSize: 14,

    fontWeight: '600',
  },

  tabIconContainer: {
    width: 42,
    height: 42,

    borderRadius: 21,

    alignItems: 'center',

    justifyContent: 'center',
  },

  tabIconContainerActive: {
    backgroundColor:
      'rgba(59,130,246,0.14)',

    borderWidth: 1,

    borderColor:
      'rgba(59,130,246,0.18)',
  },
});