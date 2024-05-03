import { Meta, StoryFn } from '@storybook/react';
import ImpactTracker from './ImpactTracker';

export default {
  component: ImpactTracker,
  title: 'Contributor/ImpactTracker'
} as Meta<typeof ImpactTracker>;

const Template: StoryFn<typeof ImpactTracker> = (props) => <ImpactTracker {...props} />;

export const Default = Template.bind({});
Default.args = {
  impact: {
    total: 123000
  } as any
};
