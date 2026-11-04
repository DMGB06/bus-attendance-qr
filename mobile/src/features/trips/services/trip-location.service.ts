import { supabase } from "@/src/core/config/supabase";
import { getUser } from "@/src/features/auth/services/auth.service";
import { isUuid } from "@/src/shared/utils/uuid";

type PublishLocationInput = {
  tripId: string;
  lat: number;
  lng: number;
};

export async function publishDriverLocation({
  tripId,
  lat,
  lng,
}: PublishLocationInput): Promise<void> {
  if (!isUuid(tripId)) {
    throw new Error("Identificador de viaje inválido.");
  }

  const user = await getUser();

  if (!user) {
    throw new Error("Debes iniciar sesión para publicar ubicación.");
  }

  const { error } = await supabase.rpc("publish_driver_location", {
    p_trip_id: tripId,
    p_lat: lat,
    p_lng: lng,
  });

  if (error) {
    throw new Error(error.message || "No se pudo guardar el punto GPS del viaje.");
  }
}
