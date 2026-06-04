import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Text } from "react-native-paper";
import { colors } from "@/constants/theme";
import { AppButton } from "./AppButton";

export function QRScanner({ onCode }: { onCode: (code: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission?.granted) {
    return (
      <View style={styles.permission}>
        <Text style={styles.text}>Camera access scans club QR codes for attendance check-in.</Text>
        <AppButton icon="camera-outline" onPress={requestPermission}>
          Allow camera
        </AppButton>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <CameraView
        facing="back"
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => {
          if (scanned) return;
          setScanned(true);
          onCode(data.split("/").pop() ?? data);
        }}
      />
      <View style={styles.frame} />
      {scanned ? (
        <AppButton mode="outlined" onPress={() => setScanned(false)}>
          Scan another
        </AppButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 360, overflow: "hidden", borderRadius: 24, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface },
  frame: { width: 230, height: 230, borderRadius: 24, borderWidth: 3, borderColor: colors.green },
  permission: { padding: 18, gap: 14, borderRadius: 20, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface },
  text: { color: colors.muted, lineHeight: 20 }
});
