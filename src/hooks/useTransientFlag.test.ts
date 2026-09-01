import { renderHook, act } from '@testing-library/react';
import { useTransientFlag } from './useTransientFlag';

describe('useTransientFlag', () => {
  it('sets flag to true and resets after duration', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTransientFlag(2000));

    expect(result.current.flag).toBe(false);

    act(() => {
      result.current.trigger();
    });
    expect(result.current.flag).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.flag).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.flag).toBe(false);

    vi.useRealTimers();
  });

  it('restarts timer when triggered again', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTransientFlag(2000));

    act(() => {
      result.current.trigger();
    });

    act(() => {
      vi.advanceTimersByTime(1500);
      result.current.trigger();
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.flag).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.flag).toBe(false);

    vi.useRealTimers();
  });
});