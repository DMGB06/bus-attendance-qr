import { supabase } from '@/src/lib/supabase';
import { getUser } from '@/src/services/auth';
import type { Trip, TripDirection } from '@/src/types';

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

async function getAuthenticatedOperatorId() {
  const user = await getUser();

  if (!user) {
    throw new Error('Debes iniciar sesión para continuar.');
  }

  return user.id;
}

async function getAnyActiveTripByOperator(operatorId: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('bus_trips')
    .select('*')
    .eq('operator_id', operatorId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo validar si existe un viaje activo.');
  }

  return data;
}

async function validateCompletedOutboundTrip(operatorId: string, tripDate: string) {
  const { data, error } = await supabase
    .from('bus_trips')
    .select('id')
    .eq('operator_id', operatorId)
    .eq('trip_date', tripDate)
    .eq('direction', 'ida')
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('No se pudo validar la ida del día.');
  }

  if (!data) {
    throw new Error('Debes completar el viaje de ida antes de iniciar la vuelta.');
  }
}

export async function startTrip(direction: TripDirection): Promise<Trip> {
  const operatorId = await getAuthenticatedOperatorId();
  const tripDate = getTodayDate();

  const activeTrip = await getAnyActiveTripByOperator(operatorId);
  if (activeTrip) {
    throw new Error('Ya tienes un viaje activo. Ciérralo antes de iniciar otro.');
  }

  if (direction === 'vuelta') {
    await validateCompletedOutboundTrip(operatorId, tripDate);
  }

  const { data, error } = await supabase
    .from('bus_trips')
    .insert({
      direction,
      status: 'active',
      started_at: new Date().toISOString(),
      operator_id: operatorId,
      trip_date: tripDate,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('No se pudo iniciar el viaje.');
  }

  return data;
}

export async function getActiveTripByOperator(): Promise<Trip | null> {
  const operatorId = await getAuthenticatedOperatorId();
  return getAnyActiveTripByOperator(operatorId);
}

export async function closeTrip(tripId: string): Promise<void> {
  const { error } = await supabase
    .from('bus_trips')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', tripId);

  if (error) {
    throw new Error('No se pudo cerrar el viaje.');
  }
}

// Compatibilidad temporal para imports existentes
export async function StartTrip(direction: TripDirection): Promise<Trip> {
  return startTrip(direction);
}

export async function getActiveTrip(): Promise<Trip | null> {
  return getActiveTripByOperator();
}
