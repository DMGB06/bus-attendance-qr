import type { ExpoPushTicket } from "./types.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  channelId?: string;
  data: Record<string, string>;
};

export async function sendExpoPushMessages(messages: PushMessage[]): Promise<ExpoPushTicket[]> {
  if (!messages.length) {
    return [];
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo push API error: ${response.status}`);
  }

  const payload = await response.json();
  return (payload.data ?? []) as ExpoPushTicket[];
}

export function isDeadPushToken(ticket: ExpoPushTicket): boolean {
  return ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered";
}
