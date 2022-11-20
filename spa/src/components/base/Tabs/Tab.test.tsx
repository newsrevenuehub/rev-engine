import { render, screen } from 'test-utils';
import Tab from './Tab';

describe('Tab', () => {
  it('displays a tab with the label specified', () => {
    render(<Tab label="test-label" />);
    expect(screen.getByRole('tab', { name: 'test-label' })).toBeVisible();
  });

  // AX test happens with <Tabs>.
});
