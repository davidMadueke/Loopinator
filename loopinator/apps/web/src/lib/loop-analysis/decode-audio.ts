let decodeContext: AudioContext | null = null;

function getDecodeContext(): AudioContext {
  decodeContext ??= new AudioContext();
  return decodeContext;
}

export async function decodeAudioArrayBuffer(
  arrayBuffer: ArrayBuffer,
): Promise<AudioBuffer> {
  const context = getDecodeContext();
  return context.decodeAudioData(arrayBuffer.slice(0));
}

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  return decodeAudioArrayBuffer(await file.arrayBuffer());
}

export async function decodeAudioUrl(url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`);
  }
  return decodeAudioArrayBuffer(await response.arrayBuffer());
}
