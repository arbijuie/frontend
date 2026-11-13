export interface HistoryTrack {
  keys: string[];
  index: number;
}

export function initialTrack(key: string): HistoryTrack {
  return { keys: [key], index: 0 };
}

export function advanceTrack(
  track: HistoryTrack,
  navigationType: string,
  key: string
): HistoryTrack {
  if (track.keys[track.index] === key) {
    return track;
  }
  if (navigationType === "PUSH") {
    return {
      keys: [...track.keys.slice(0, track.index + 1), key],
      index: track.index + 1,
    };
  }
  if (navigationType === "REPLACE") {
    const keys = [...track.keys];
    keys[track.index] = key;
    return { keys, index: track.index };
  }
  const known = track.keys.indexOf(key);
  if (known >= 0) {
    return { keys: track.keys, index: known };
  }
  return initialTrack(key);
}

export function canGoForward(track: HistoryTrack): boolean {
  return track.index < track.keys.length - 1;
}
