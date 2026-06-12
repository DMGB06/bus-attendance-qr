import { useEffect, useState } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

function readIsConnected(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let mounted = true;

    void NetInfo.fetch().then((state) => {
      if (mounted) {
        setIsConnected(readIsConnected(state));
      }
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(readIsConnected(state));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { isConnected, isOffline: !isConnected };
}
