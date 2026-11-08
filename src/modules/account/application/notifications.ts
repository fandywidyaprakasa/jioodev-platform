import { createRecord } from "@/shared/infrastructure/pocketbase/pb-platform";

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  channel?: string;
}) {
  await createRecord("notifications", {
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link ?? "/app",
    channel: input.channel ?? "inapp",
    read: false,
  }).catch(() => undefined);
}
