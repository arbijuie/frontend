import { renderHook } from '@testing-library/react';

import { useQuery } from '@tanstack/react-query';
import { useStatus } from './useStatus';
import { fetchStatus } from '../api/status';
import { POLL_INTERVAL_MS } from '../api/config';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../api/status', () => ({
  fetchStatus: vi.fn(),
}));

const mockedUseQuery = vi.mocked(useQuery);

describe('useStatus', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uses polling interval and maps query state', () => {
    const refetch = vi.fn();
    mockedUseQuery.mockReturnValue({
      data: { uptime_s: 1 },
      error: null,
      isLoading: false,
      isFetching: true,
      refetch,
      dataUpdatedAt: 123,
    } as never);

    const { result } = renderHook(() => useStatus());

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ['status'],
      queryFn: fetchStatus,
      refetchInterval: POLL_INTERVAL_MS,
    });
    expect(result.current.data).toEqual({ uptime_s: 1 });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.fetching).toBe(true);
    expect(result.current.refetch).toBe(refetch);
    expect(result.current.fetchedAt).toBe(123);
  });

  it('normalizes non-Error query failures', () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      error: 'boom',
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
      dataUpdatedAt: 0,
    } as never);

    const { result } = renderHook(() => useStatus());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
