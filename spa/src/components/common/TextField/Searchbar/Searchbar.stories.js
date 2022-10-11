import Searchbar from './Searchbar';

const args = {
  placeholder: 'Pages'
};

export default {
  title: 'Common/Searchbar',
  component: Searchbar
};

export const Default = Searchbar.bind({});

Default.args = {
  ...args
};
