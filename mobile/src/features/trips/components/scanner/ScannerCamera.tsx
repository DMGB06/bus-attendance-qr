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
  const { colors } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        frame: {
          borderRadius: 32,
          overflow: "hidden",
          backgroundColor: colors.scannerCameraBg,
          borderWidth: 1,
          borderColor: colors.scannerCameraBorder,
          position: "relative",
          shadowColor: colors.scannerCameraShadow,
          shadowOpacity: 0.18,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 12 },
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
          width: 34,
          height: 34,
          borderColor: colors.scannerCorner,
          borderWidth: 3,
        },
        topLeft: {
          top: 24,
          left: 24,
          borderRightWidth: 0,
          borderBottomWidth: 0,
        },
        topRight: {
          top: 24,
          right: 24,
          borderLeftWidth: 0,
          borderBottomWidth: 0,
        },
        bottomLeft: {
          bottom: 24,
          left: 24,
          borderRightWidth: 0,
          borderTopWidth: 0,
        },
        bottomRight: {
          bottom: 24,
          right: 24,
          borderLeftWidth: 0,
          borderTopWidth: 0,
        },
        scanLine: {
          width: "82%",
          height: 4,
          borderRadius: 999,
          backgroundColor: colors.scannerScanLine,
          opacity: 0.95,
        },
        hint: {
          position: "absolute",
          bottom: 22,
          color: colors.scannerHintText,
          fontSize: 14,
          fontWeight: "600",
          backgroundColor: colors.scannerHintPillBg,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          overflow: "hidden",
        },
      }),
    [colors],
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
