import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

export default function PwaInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [platformType, setPlatformType] = useState<'ios' | 'android' | null>(null);
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    const isDismissed = sessionStorage.getItem('pwa-banner-dismissed') === 'true';
    if (isDismissed) return;

    const userAgent = window.navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;

    if (isIOS) {
      setPlatformType('ios');
      setShowBanner(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;

      if (!isIOS) {
        setPlatformType('android');
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setShowBanner(false);
      deferredPromptRef.current = null;
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallAndroid = async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return;

    promptEvent.prompt();

    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    deferredPromptRef.current = null;
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
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
              <Text style={styles.boldText}>"Agregar a inicio"</Text>.
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
          <TouchableOpacity style={styles.installButton} onPress={handleInstallAndroid}>
            <Text style={styles.installButtonText}>Instalar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
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
    padding: 6,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});