export function inspectVoiceWav(bytes: Buffer): { seconds: number; fingerprint: string };
export function provisionVoice(input: {
  owner: string; language: string; consentAudio: Buffer; sampleAudio: Buffer;
  previous?: Record<string, unknown> | null; execute?: boolean; ownerConfirmed?: boolean;
  enabled?: boolean; apiKey?: string;
}, dependencies?: {
  fetcher?: typeof fetch; checkpoint?: (value: Record<string, unknown>) => Promise<void>;
}): Promise<Record<string, unknown>>;
