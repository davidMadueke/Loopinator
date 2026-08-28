/** Average channels into one mono buffer for loop snap analysis. */
export function mixToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const mono = new Float32Array(length);
  const channelCount = buffer.numberOfChannels;

  if (channelCount === 0) {
    return mono;
  }

  for (let channel = 0; channel < channelCount; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      mono[i]! += data[i]! / channelCount;
    }
  }

  return mono;
}
