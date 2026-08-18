import type { CaseMessage } from "@/lib/messages/queries";

export function mergeRefreshedMessages(
  current: CaseMessage[],
  incoming: CaseMessage[],
  rotateAudioUrls = false
): CaseMessage[] {
  if (rotateAudioUrls) {
    return incoming;
  }

  const currentById = new Map(current.map((message) => [message.id, message]));

  return incoming.map((message) => {
    const previous = currentById.get(message.id);

    if (previous?.audioUrl && previous.audio_path === message.audio_path) {
      return { ...message, audioUrl: previous.audioUrl };
    }

    return message;
  });
}
