import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Table from './Table';
import TableBody from './TableBody';
import TableCell from './TableCell';
import TableHead from './TableHead';
import TableRow from './TableRow';

// This tests all components in this directory since they should be used
// together.

function tree() {
  return render(
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>ID</TableCell>
          <TableCell>Color</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>1</TableCell>
          <TableCell>Red</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>2</TableCell>
          <TableCell>Green</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>3</TableCell>
          <TableCell>Blue</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

describe('Table', () => {
  it('renders a table', () => {
    tree();
    expect(screen.getByRole('table')).toBeVisible();
  });

  it('renders headers', () => {
    tree();
    expect(screen.getByRole('columnheader', { name: 'ID' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Color' })).toBeVisible();
  });

  it('renders cells', () => {
    tree();
    expect(screen.getByRole('cell', { name: '1' })).toBeVisible();
    expect(screen.getByRole('cell', { name: '2' })).toBeVisible();
    expect(screen.getByRole('cell', { name: '3' })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'Red' })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'Green' })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'Blue' })).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
