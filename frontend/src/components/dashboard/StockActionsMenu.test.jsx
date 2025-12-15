import { fireEvent, render, screen } from '@testing-library/react';
import StockActionsMenu from './StockActionsMenu';

describe('StockActionsMenu', () => {
  const mockItem = { symbol: 'AAPL', is_in_portfolio: true, is_watched: false };
  const mockOnTogglePortfolio = jest.fn();
  const mockOnToggleWatchlist = jest.fn();
  const mockOnOpenChart = jest.fn();

  it('renders Latest News button and opens NewsModal on click', () => {
    render(
      <StockActionsMenu
        item={mockItem}
        onTogglePortfolio={mockOnTogglePortfolio}
        onToggleWatchlist={mockOnToggleWatchlist}
        onOpenChart={mockOnOpenChart}
      />
    );

    const latestNewsButton = screen.getByText('Latest News');
    expect(latestNewsButton).toBeInTheDocument();

    fireEvent.click(latestNewsButton);

    const newsModal = screen.getByText(`Latest News for ${mockItem.symbol}`);
    expect(newsModal).toBeInTheDocument();
  });
});