import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { IconButton, IconButtonProps } from './IconButton';
import { EditOutlined } from '@material-ui/icons';

function tree(props?: Partial<IconButtonProps>) {
  return render(
    <IconButton aria-label="mock-button-label" {...props}>
      <EditOutlined />
    </IconButton>
  );
}

describe('IconButton', () => {
  it('displays a button', () => {
    tree();
    expect(screen.getByRole('button', { name: 'mock-button-label' })).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
