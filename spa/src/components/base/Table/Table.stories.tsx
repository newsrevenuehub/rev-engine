import { Meta, StoryFn } from '@storybook/react';
import Table from './Table';
import TableBody from './TableBody';
import TableCell from './TableCell';
import TableHead from './TableHead';
import TableRow from './TableRow';
export default {
  component: Table,
  title: 'Base/Table'
} as Meta<typeof Table>;

const Template: StoryFn<typeof Table> = (props) => (
  <Table {...props}>
    <TableHead>
      <TableRow>
        <TableCell>ID</TableCell>
        <TableCell>Color</TableCell>
        <TableCell>Cost</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      <TableRow>
        <TableCell>1</TableCell>
        <TableCell>Red</TableCell>
        <TableCell>$1.99</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>2</TableCell>
        <TableCell>Green</TableCell>
        <TableCell>$4.99</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>3</TableCell>
        <TableCell>Blue</TableCell>
        <TableCell>$0.99</TableCell>
      </TableRow>
    </TableBody>
  </Table>
);

export const Unsortable = Template.bind({});
