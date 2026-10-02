const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const MAX_ATTEMPTS = 5;

export function getBackoffDelayMs(attempt: number): number {
  const delay = BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay, MAX_DELAY_MS);
}

export function shouldGiveUp(attempt: number): boolean {
  return attempt >= MAX_ATTEMPTS;
}
