import React from 'react';
import { render } from '../testUtils';
import { Home } from '../../pages/index';

describe('Home page', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<Home />, {});
    expect(asFragment()).toMatchSnapshot();
  });

  it('clicking button triggers alert', () => {
    const { getByText } = render(<Home />, {});
    expect(getByText('Next.js!')).not.toBeNull();
  });
});
