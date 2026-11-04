import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
} from '@/components/pwa-install-prompt';

const DISMISSED_KEY = 'pwa-banner-dismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function isAppleMobile(): boolean {
  const { userAgent, platform, maxTouchPoints } = window.navigator;
  // iPadOS se anuncia como Mac: solo se distingue por la pantalla tactil.
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export default function PwaInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [platformType, setPlatformType] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    if (wasDismissed()) return;

    const isIOS = isAppleMobile();
    if (isIOS) {
      setPlatformType('ios');
      setShowBanner(true);
      return;
    }

    const showInstallButton = () => {
      setPlatformType('android');
      setShowBanner(true);
    };

    if (getDeferredInstallPrompt()) {
      showInstallButton();
    }

    window.addEventListener('beforeinstallprompt', showInstallButton);

    const handleAppInstalled = () => {
      setShowBanner(false);
      clearDeferredInstallPrompt();
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', showInstallButton);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallAndroid = async () => {
    const promptEvent = getDeferredInstallPrompt();
    if (!promptEvent) return;

    await promptEvent.prompt();
    await promptEvent.userChoice;
    // El evento solo sirve una vez: el boton ya no podria hacer nada.
    clearDeferredInstallPrompt();
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      /* almacenamiento bloqueado: el aviso volvera a salir en la proxima visita */
    }
  };

  if (!showBanner || !platformType) return null;

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.textContainer}>
        {platformType === 'ios' ? (
          <>
            <Text style={styles.title}>Instala CerroBus en tu iPhone</Text>
            <Text style={styles.instruction}>
              Presiona el botón de compartir{' '}
              <Text style={styles.boldText}>Compartir 📤</Text> (abajo en Safari) y selecciona{' '}
              <Text style={styles.boldText}>Agregar a inicio</Text>.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Instala CerroBus</Text>
            <Text style={styles.instruction}>
              Instala la aplicación en tu pantalla de inicio para un acceso rápido.
            </Text>
          </>
        )}
      </View>

      <View style={styles.actionsContainer}>
        {platformType === 'android' && (
          <TouchableOpacity
            style={styles.installButton}
            onPress={handleInstallAndroid}
            accessibilityRole="button"
            accessibilityLabel="Instalar CerroBus"
          >
            <Text style={styles.installButtonText}>Instalar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso de instalación"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#1C3284',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#152766',
    width: '100%',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  instruction: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 16,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  installButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginRight: 12,
  },
  installButtonText: {
    color: '#1C3284',
    fontWeight: 'bold',
    fontSize: 13,
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});