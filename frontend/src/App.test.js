// src/App.test.js
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Unravel header', () => {
  render(<App />);
  const linkElement = screen.getByText(/Unravel/i);
  expect(linkElement).toBeInTheDocument();
});