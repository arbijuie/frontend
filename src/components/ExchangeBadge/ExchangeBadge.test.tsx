import { render, screen } from '@testing-library/react';

import ExchangeBadge from './ExchangeBadge';

describe('ExchangeBadge', () => {
  it.each(['hyperliquid', 'lighter', 'aster', 'binance', 'bybit', 'dydx', 'extended'])(
    'styles known venue %s with its own class',
    (exchange) => {
      render(<ExchangeBadge exchange={exchange} />);
      const badge = screen.getByText(exchange);
      expect(badge.className).toContain(exchange);
      expect(badge.className).not.toContain('unknown');
    },
  );

  it('falls back to the unknown style for other venues', () => {
    render(<ExchangeBadge exchange="okx" />);
    expect(screen.getByText('okx').className).toContain('unknown');
  });
});
