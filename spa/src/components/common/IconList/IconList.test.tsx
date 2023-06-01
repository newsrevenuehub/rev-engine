import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import IconList, { IconListProps } from './IconList';

const list = [
  { icon: 'mock-icon-1', text: 'mock-text-1' },
  { icon: 'mock-icon-2', text: 'mock-text-2' },
  { icon: 'mock-icon-3', text: 'mock-text-3' }
];

function tree(props?: Partial<IconListProps>) {
  return render(<IconList list={list} {...props} />);
}

describe('IconList', () => {
  it('renders list', () => {
    tree();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('displays icons', () => {
    tree();
    expect(screen.getAllByTestId('list-item-icon')).toHaveLength(3);
    expect(screen.getByText('mock-icon-1')).toBeInTheDocument();
    expect(screen.getByText('mock-icon-2')).toBeInTheDocument();
    expect(screen.getByText('mock-icon-3')).toBeInTheDocument();
  });

  it('displays texts', () => {
    tree();
    expect(screen.getAllByTestId('list-item-text')).toHaveLength(3);
    expect(screen.getByText('mock-text-1')).toBeInTheDocument();
    expect(screen.getByText('mock-text-2')).toBeInTheDocument();
    expect(screen.getByText('mock-text-3')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
