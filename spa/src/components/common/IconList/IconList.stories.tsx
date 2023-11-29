import { ComponentMeta, ComponentStory } from '@storybook/react';

import Mail from '@material-design-icons/svg/filled/mail.svg?react';
import GroupAdd from '@material-design-icons/svg/filled/group_add.svg?react';
import Diversity from '@material-design-icons/svg/filled/diversity_2.svg?react';

import IconList, { IconListProps } from './IconList';

export default {
  component: IconList,
  title: 'Common/IconList'
} as ComponentMeta<typeof IconList>;

const Template: ComponentStory<typeof IconList> = (props: IconListProps) => <IconList {...props} />;

export const Default = Template.bind({});
Default.args = {
  list: [
    { icon: <Mail />, text: 'Regularly thank, steward and bump up current contributors' },
    { icon: <GroupAdd />, text: 'Re-engage lapsed donors' },
    { icon: <Diversity />, text: 'Consistently market to new contributors, segmenting out those who already gave' }
  ]
};
