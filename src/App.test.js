import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders Title', () => {
  const { getByText } = render(<App />);
  const linkElement = getByText(/Spotify Last 50 Played/i);
  expect(linkElement).toBeInTheDocument();
});
