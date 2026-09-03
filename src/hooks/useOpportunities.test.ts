import { renderHook } from '@testing-library/react';

import { useQuery } from '@tanstack/react-query';
import { useOpportunities } from './useOpportunities';
import { fetchOpportunities } from '../api/opportunities';
import { POLL_INTERVAL_MS } from '../api/config';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../api/opportunities', () => ({
  fetchOpportunities: vi.fn(),
}));

const mockedUseQuery = vi.mocked(useQuery);

describe('useOpportunities', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uses polling interval and maps query state', () => {
    const refetch = vi.fn();
    mockedUseQuery.mockReturnValue({
      data: { count: 0, ready_count: 0, updated_at: null, opportunities: [] },
      error: null,
      isLoading: true,
      isFetching: true,
      refetch,
    } as never);

    const { result } = renderHook(() => useOpportunities());

    expect(mockedUseQuery).toHaveBeenCalledWith({
      queryKey: ['opportunities'],
      queryFn: fetchOpportunities,
      refetchInterval: POLL_INTERVAL_MS,
    });
    expect(result.current.data).toEqual({
      count: 0,
      ready_count: 0,
      updated_at: null,
      opportunities: [],
    });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.fetching).toBe(true);
    expect(result.current.refetch).toBe(refetch);
  });

  it('returns Error message when query fails', () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      error: new Error('network down'),
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as never);

    const { result } = renderHook(() => useOpportunities());

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('network down');
  });
});
