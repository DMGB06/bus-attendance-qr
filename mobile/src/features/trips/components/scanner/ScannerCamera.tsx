import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { CameraView } from "expo-camera";
import { Text } from "react-native-paper";

import { useAppTheme } from "@/src/core/theme/ThemeProvider";

type ScannerCameraProps = {
  height: number;
  onBarcodeScanned: (event: { data: string }) => void;
};

export function ScannerCamera({ height, onBarcodeScanned }: ScannerCameraProps) {
  const { colors, tokens } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        frame: {
          borderRadius: tokens.spacing["2xl"],
          overflow: "hidden",
          backgroundColor: colors.scannerCameraBg,
          borderWidth: 1,
          borderColor: colors.scannerCameraBorder,
          position: "relative",
          shadowColor: colors.scannerCameraShadow,
          shadowOpacity: 0.18,
          shadowRadius: tokens.spacing.xl,
          shadowOffset: { width: 0, height: tokens.spacing.md },
          elevation: 10,
        },
        camera: {
          flex: 1,
        },
        overlay: {
          ...StyleSheet.absoluteFillObject,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.scannerOverlay,
        },
        corner: {
          position: "absolute",
          width: tokens.spacing.xl,
          height: tokens.spacing.xl,
          borderColor: colors.scannerCorner,
          borderWidth: 3,
        },
        topLeft: {
          top: tokens.spacing.xl,
          left: tokens.spacing.xl,
          borderRightWidth: 0,
          borderBottomWidth: 0,
        },
        topRight: {
          top: tokens.spacing.xl,
          right: tokens.spacing.xl,
          borderLeftWidth: 0,
          borderBottomWidth: 0,
        },
        bottomLeft: {
          bottom: tokens.spacing.xl,
          left: tokens.spacing.xl,
          borderRightWidth: 0,
          borderTopWidth: 0,
        },
        bottomRight: {
          bottom: tokens.spacing.xl,
          right: tokens.spacing.xl,
          borderLeftWidth: 0,
          borderTopWidth: 0,
        },
        scanLine: {
          width: "82%",
          height: tokens.spacing.xs,
          borderRadius: tokens.radius.full,
          backgroundColor: colors.scannerScanLine,
          opacity: 0.95,
        },
        hint: {
          position: "absolute",
          bottom: tokens.radius.xl,
          ...tokens.typography.bodyStrong,
          color: colors.scannerHintText,
          backgroundColor: colors.scannerHintPillBg,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          borderRadius: tokens.radius.full,
          overflow: "hidden",
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={[styles.frame, { height }]}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={onBarcodeScanned}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        <View style={styles.scanLine} />
        <Text style={styles.hint}>Apunta el QR dentro del marco</Text>
      </View>
    </View>
  );
}
