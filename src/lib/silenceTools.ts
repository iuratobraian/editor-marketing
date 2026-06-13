export interface SilenceRange {
  start: number;
  end: number;
}

export interface SilenceAnalysisOptions {
  threshold?: number;
  windowDuration?: number;
  minSilenceDuration?: number;
  onProgress?: (percent: number) => void;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

async function analyzeAudioEnvelope(sourceUrl: string, options: SilenceAnalysisOptions = {}) {
  const {
    threshold = 0.018,
    windowDuration = 0.08,
    minSilenceDuration = 0.7,
    onProgress,
  } = options;

  onProgress?.(5);

  try {
    const response = await fetch('http://localhost:3001/analyze-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: sourceUrl,
        silenceNoiseDb: Math.round(Math.log10(Math.max(threshold, 0.0001)) * 20),
        silenceDuration: minSilenceDuration,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const speechSegments = Array.isArray(data.speechSegments) ? data.speechSegments : [];
      const silenceSegments = Array.isArray(data.silenceSegments) ? data.silenceSegments : [];
      onProgress?.(95);
      return {
        decoded: null,
        duration: Number(data.duration) || 0,
        windowDuration,
        minSilentWindows: Math.max(1, Math.ceil(minSilenceDuration / windowDuration)),
        silentFlags: [],
        speechSegments,
        silenceSegments,
        onProgress,
      };
    }
  } catch (_) {
    // Fallback to client-side decode below.
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`No se pudo leer el archivo de audio/video (${response.status}).`);
  }

  onProgress?.(15);
  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new AudioContext();

  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const duration = decoded.duration;
    const sampleRate = decoded.sampleRate;
    const windowSize = Math.max(1, Math.floor(sampleRate * windowDuration));
    const totalWindows = Math.max(1, Math.ceil(decoded.length / windowSize));
    const minSilentWindows = Math.max(1, Math.ceil(minSilenceDuration / windowDuration));
    const channelData = Array.from({ length: decoded.numberOfChannels }, (_, index) =>
      decoded.getChannelData(index)
    );

    const silentFlags: boolean[] = [];
    for (let windowIndex = 0; windowIndex < totalWindows; windowIndex += 1) {
      const start = windowIndex * windowSize;
      const end = Math.min(decoded.length, start + windowSize);
      let sum = 0;
      let count = 0;

      for (let channel = 0; channel < channelData.length; channel += 1) {
        const samples = channelData[channel];
        for (let i = start; i < end; i += 1) {
          const sample = samples[i] || 0;
          sum += sample * sample;
          count += 1;
        }
      }

      const rms = count > 0 ? Math.sqrt(sum / count) : 0;
      silentFlags.push(rms < threshold);
      if (windowIndex % 4 === 0) {
        const scanProgress = 20 + (windowIndex / totalWindows) * 60;
        onProgress?.(clampPercent(scanProgress));
      }
    }

    return {
      decoded,
      duration,
      windowDuration,
      minSilentWindows,
      silentFlags,
      speechSegments: buildSegmentsFromFlags(
        silentFlags,
        windowDuration,
        minSilentWindows,
        (flag) => !flag
      ).filter((segment) => segment.end - segment.start > 0.25),
      silenceSegments: buildSegmentsFromFlags(
        silentFlags,
        windowDuration,
        minSilentWindows,
        (flag) => flag
      ),
      onProgress,
    };
  } finally {
    await audioContext.close().catch(() => {});
  }
}

function buildSegmentsFromFlags(
  flags: boolean[],
  windowDuration: number,
  minRunWindows: number,
  isRunIncluded: (flag: boolean) => boolean
) {
  const ranges: SilenceRange[] = [];
  let runStart = -1;

  for (let cursor = 0; cursor <= flags.length; cursor += 1) {
    const active = cursor < flags.length ? isRunIncluded(flags[cursor]) : false;
    if (active && runStart === -1) {
      runStart = cursor;
      continue;
    }

    if ((!active || cursor === flags.length) && runStart !== -1) {
      const runEnd = cursor;
      const runLength = runEnd - runStart;
      if (runLength >= minRunWindows) {
        ranges.push({
          start: runStart * windowDuration,
          end: runEnd * windowDuration,
        });
      }
      runStart = -1;
    }
  }

  return ranges;
}

export async function detectSilentSections(
  sourceUrl: string,
  options: SilenceAnalysisOptions = {}
): Promise<{ keepSegments: SilenceRange[]; removedDuration: number; duration: number }> {
  const envelope = await analyzeAudioEnvelope(sourceUrl, options);
  const silenceRanges = envelope.silenceSegments?.length
    ? envelope.silenceSegments
    : buildSegmentsFromFlags(
        envelope.silentFlags,
        envelope.windowDuration,
        envelope.minSilentWindows,
        (flag) => flag
      );

  const keepSegments: SilenceRange[] = [];
  let keepStart = 0;

  for (const silence of silenceRanges) {
    if (silence.start > keepStart + 0.05) {
      keepSegments.push({ start: keepStart, end: silence.start });
    }
    keepStart = silence.end;
  }

  if (keepStart < envelope.duration - 0.05) {
    keepSegments.push({ start: keepStart, end: envelope.duration });
  }

  const filteredSegments = keepSegments.filter((segment) => segment.end - segment.start > 0.15);
  const keptDuration = filteredSegments.reduce((acc, segment) => acc + (segment.end - segment.start), 0);
  const removedDuration = Math.max(0, envelope.duration - keptDuration);

  envelope.onProgress?.(95);
  return {
    keepSegments: filteredSegments,
    removedDuration,
    duration: envelope.duration,
  };
}

export async function detectSpeechSections(
  sourceUrl: string,
  options: SilenceAnalysisOptions = {}
): Promise<{ speechSegments: SilenceRange[]; duration: number }> {
  const envelope = await analyzeAudioEnvelope(sourceUrl, options);
  const speechSegments = envelope.speechSegments?.length
    ? envelope.speechSegments
    : buildSegmentsFromFlags(
        envelope.silentFlags,
        envelope.windowDuration,
        1,
        (flag) => !flag
      ).filter((segment) => segment.end - segment.start > 0.25);

  envelope.onProgress?.(95);
  return {
    speechSegments,
    duration: envelope.duration,
  };
}
