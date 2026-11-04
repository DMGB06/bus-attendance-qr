import * as Location from "expo-location";

export async function ensureForegroundLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();

  if (current.granted) {
    return true;
  }

  if (!current.canAskAgain) {
    return false;
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.granted;
}

export async function getBalancedCurrentPosition(): Promise<Location.LocationObject> {
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
}
