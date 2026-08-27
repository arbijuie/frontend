export type SignClass = 'positive' | 'negative' | 'neutral';

export function signColor(value: number | null): SignClass {
  if (value == null || value === 0) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}

export function getFundingTargetTime(snapshotTime: string, hoursFromSnapshot: number): Date {
  const snapshotMs = new Date(snapshotTime).getTime();
  return new Date(snapshotMs + hoursFromSnapshot * 60 * 60 * 1000);
}

export function formatCountdown(target: Date, now: Date): { text: string; urgent: boolean } {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return { text: 'now', urgent: true };

  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const urgent = diffMs < 5 * 60 * 1000;

  if (h === 0 && m < 10) {
    return { text: `${m}:${String(s).padStart(2, '0')}`, urgent };
  }
  if (h > 0) return { text: `${h}h ${m}m`, urgent: false };
  return { text: `${m}m`, urgent };
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}
