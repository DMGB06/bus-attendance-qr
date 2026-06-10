import { NoActiveTripView } from "@/src/features/trips/components/NoActiveTripView";
import { ScannerActiveView } from "@/src/features/trips/screens/ScannerActiveView";
import { useTripStore } from "@/src/features/trips/store/tripStore";

export default function ScannerScreen() {
  const { activeTrip } = useTripStore();

  if (!activeTrip) {
    return <NoActiveTripView context="scanner" />;
  }

  return <ScannerActiveView activeTrip={activeTrip} />;
}
