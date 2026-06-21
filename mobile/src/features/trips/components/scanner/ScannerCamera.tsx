import { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { CameraView } from "expo-camera";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";

type ScannerCameraProps = {
  style?: StyleProp<ViewStyle>;
  scanningEnabled?: boolean;
  onBarcodeScanned: (event: { data: string }) => void;
};

export function ScannerCamera({
  style,
  scanningEnabled = true,
  onBarcodeScanned,
}: ScannerCameraProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        frame: {
          flex: 1,
          width: "100%",
          minHeight: 200,
          borderRadius: tokens.radius.xl,
          overflow: "hidden",
          backgroundColor: colors.scannerCameraBg,
          borderWidth: 1,
          borderColor: colors.surfaceCardBorder,
          position: "relative",
        },
        camera: {
          ...StyleSheet.absoluteFillObject,
        },
        overlay: {
          ...StyleSheet.absoluteFillObject,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.scannerOverlay,
          pointerEvents: "none",
        },
        scanRegion: {
          width: "68%",
          maxWidth: 280,
          aspectRatio: 1,
          position: "relative",
        },
        corner: {
          position: "absolute",
          width: 22,
          height: 22,
          borderColor: colors.accent,
          borderWidth: 2,
        },
        topLeft: {
          top: 0,
          left: 0,
          borderRightWidth: 0,
          borderBottomWidth: 0,
          borderTopLeftRadius: tokens.radius.sm,
        },
        topRight: {
          top: 0,
          right: 0,
          borderLeftWidth: 0,
          borderBottomWidth: 0,
          borderTopRightRadius: tokens.radius.sm,
        },
        bottomLeft: {
          bottom: 0,
          left: 0,
          borderRightWidth: 0,
          borderTopWidth: 0,
          borderBottomLeftRadius: tokens.radius.sm,
        },
        bottomRight: {
          bottom: 0,
          right: 0,
          borderLeftWidth: 0,
          borderTopWidth: 0,
          borderBottomRightRadius: tokens.radius.sm,
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={[styles.frame, style]}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanningEnabled ? onBarcodeScanned : undefined}
      />
      <View style={styles.overlay}>
        <View style={styles.scanRegion}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>
    </View>
  );
}
