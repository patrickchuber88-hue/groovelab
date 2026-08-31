self.onmessage = (e: MessageEvent) => {
  const { channelData, numBars = 192 } = e.data;
  
  if (!channelData) {
    self.postMessage({ waveformBars: Array(numBars).fill(16) });
    return;
  }

  const samplesPerBar = Math.floor(channelData.length / numBars);
  const rawMetrics: number[] = [];

  for (let i = 0; i < numBars; i++) {
    const start = i * samplesPerBar;
    const end = start + samplesPerBar;
    let peak = 0;
    let sumSquares = 0;

    for (let j = start; j < end; j++) {
      const val = channelData[j];
      const abs = val < 0 ? -val : val;
      if (abs > peak) peak = abs;
      sumSquares += val * val;
    }

    const rms = Math.sqrt(sumSquares / samplesPerBar);
    const combined = (0.7 * peak) + (0.3 * rms);
    rawMetrics.push(combined);
  }

  const globalMax = Math.max(...rawMetrics, 0.001);
  
  const finalBars = rawMetrics.map(val => {
    const normalized = val / globalMax;
    const expanded = Math.pow(normalized, 1.32); 
    const minHeight = 4;
    const maxHeight = 48;
    return minHeight + (expanded * (maxHeight - minHeight));
  });

  self.postMessage({ waveformBars: finalBars });
};
