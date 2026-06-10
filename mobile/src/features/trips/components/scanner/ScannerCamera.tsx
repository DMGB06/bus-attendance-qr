import { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { CameraView } from "expo-camera";
import { Text } from "react-native-paper";

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
          borderRadius: tokens.radius["2xl"],
          overflow: "hidden",
          backgroundColor: colors.scannerCameraBg,
          borderWidth: 1,
          borderColor: colors.scannerCameraBorder,
          position: "relative",
          shadowColor: colors.scannerCameraShadow,
          shadowOpacity: 0.18,
          shadowRadius: tokens.spacing.xl,
          shadowOffset: { width: 0, height: tokens.spacing.sm },
          elevation: 10,
        },
        camera: {
          ...StyleSheet.absoluteFillObject,
        },
        overlay: {
          ...StyleSheet.absoluteFillObject,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.scannerOverlay,
        },
        scanRegion: {
          width: "74%",
          maxWidth: 320,
          aspectRatio: 1,
          position: "relative",
          justifyContent: "center",
          alignItems: "center",
        },
        corner: {
          position: "absolute",
          width: "18%",
          height: "18%",
          minWidth: 28,
          minHeight: 28,
          maxWidth: 44,
          maxHeight: 44,
          borderColor: colors.scannerCorner,
          borderWidth: 3,
        },
        topLeft: {
          top: 0,
          left: 0,
          borderRightWidth: 0,
          borderBottomWidth: 0,
        },
        topRight: {
          top: 0,
          right: 0,
          borderLeftWidth: 0,
          borderBottomWidth: 0,
        },
        bottomLeft: {
          bottom: 0,
          left: 0,
          borderRightWidth: 0,
          borderTopWidth: 0,
        },
        bottomRight: {
          bottom: 0,
          right: 0,
          borderLeftWidth: 0,
          borderTopWidth: 0,
        },
        scanLine: {
          width: "88%",
          height: tokens.spacing.xs,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.scannerScanLine,
          opacity: 0.95,
        },
        hint: {
          position: "absolute",
          bottom: tokens.spacing.md,
          left: tokens.spacing.md,
          right: tokens.spacing.md,
          ...tokens.typography.bodyStrong,
          color: colors.scannerHintText,
          backgroundColor: colors.scannerHintPillBg,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          borderRadius: tokens.radius.full,
          overflow: "hidden",
          textAlign: "center",
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
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.scanRegion}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <View style={styles.scanLine} />
        </View>
        <Text style={styles.hint} numberOfLines={2}>
          Apunta el QR dentro del marco
        </Text>
      </View>
    </View>
  );
}
