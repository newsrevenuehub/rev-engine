import { render, screen } from 'test-utils';

import PaginatedTable from './PaginatedTable';

const columns = [
  {
    Header: 'Column 1 Header',
    accessor: 'header',
    Cell: (props) => props.value
  },
  {
    Header: 'Column 2 Header',
    accessor: 'subheader',
    Cell: (props) => props.value
  }
];

const data = [
  {
    id: 'xyz',
    header: 'Data header 1',
    subheader: 'Data subheader 1'
  },
  {
    id: 'abc',
    header: 'Data header 2',
    subheader: 'Data subheader 2'
  }
];

describe('PaginatedTable', () => {
  it('should render empty state', () => {
    render(<PaginatedTable columns={columns} data={[]} pageCount={0} fetchData={() => {}} />);
    const page1 = screen.queryByRole('button', { name: 'page 1' });
    expect(page1).not.toBeInTheDocument();

    const previousPage = screen.getByRole('button', { name: 'Go to previous page' });
    expect(previousPage).toBeDisabled();

    const nextPage = screen.getByRole('button', { name: 'Go to next page' });
    expect(nextPage).toBeDisabled();

    const emptyText = screen.getByText('0 contributions to show.');
    expect(emptyText).toBeVisible();
  });

  it('should render columns', () => {
    render(<PaginatedTable columns={columns} data={[]} pageCount={0} fetchData={() => {}} />);
    const rows = screen.queryAllByRole('row');
    expect(rows).toHaveLength(1);

    const column1 = screen.getByText(columns[0].Header);
    expect(column1).toBeInTheDocument();

    const column2 = screen.getByText(columns[1].Header);
    expect(column2).toBeInTheDocument();
  });

  it('should render data single page', () => {
    render(<PaginatedTable columns={columns} data={data} pageCount={1} fetchData={() => {}} />);
    const rows = screen.queryAllByRole('row');
    expect(rows).toHaveLength(data.length + 1); // data rows + header

    const cells = screen.queryAllByRole('cell');
    expect(cells).toHaveLength(data.length * columns.length); // cells = number rows * number columns

    const row1column1 = screen.getByText(data[0].header);
    expect(row1column1).toBeInTheDocument();

    const row1column2 = screen.getByText(data[0].subheader);
    expect(row1column2).toBeInTheDocument();

    const row2column1 = screen.getByText(data[1].header);
    expect(row2column1).toBeInTheDocument();

    const row2column2 = screen.getByText(data[1].subheader);
    expect(row2column2).toBeInTheDocument();

    const page1 = screen.getByRole('button', { name: 'page 1' });
    expect(page1).toBeEnabled();

    const previousPage = screen.getByRole('button', { name: 'Go to previous page' });
    expect(previousPage).toBeDisabled();

    const nextPage = screen.getByRole('button', { name: 'Go to next page' });
    expect(nextPage).toBeDisabled();

    const emptyText = screen.queryByText('0 contributions to show.');
    expect(emptyText).not.toBeInTheDocument();
  });

  it('should render multiple pages', () => {
    render(<PaginatedTable columns={columns} data={[]} pageCount={2} fetchData={() => {}} />);

    const page1 = screen.getByRole('button', { name: 'page 1' });
    expect(page1).toBeEnabled();

    const page2 = screen.getByRole('button', { name: 'Go to page 2' });
    expect(page2).toBeEnabled();

    const previousPage = screen.getByRole('button', { name: 'Go to previous page' });
    expect(previousPage).toBeDisabled();

    const nextPage = screen.getByRole('button', { name: 'Go to next page' });
    expect(nextPage).toBeEnabled();
  });
});
