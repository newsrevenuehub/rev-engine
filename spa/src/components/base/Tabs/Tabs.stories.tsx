import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';
import Tab from './Tab';
import TabPanel from './TabPanel';
import Tabs from './Tabs';

export default {
  component: Tabs,
  title: 'Base/Tabs',
  parameters: {
    docs: {
      description: {
        component: 'A MUI-based tab panel. See [the API](https://v4.mui.com/components/tabs/) for more details.'
      }
    }
  }
} as Meta<typeof Tabs>;

const Template: StoryFn<typeof Tabs> = () => {
  const tabNames = ['Red', 'Green', 'Blue'];
  const [tab, setTab] = useState(0);

  return (
    <>
      <Tabs aria-label="Demo Tabs" value={tab}>
        {tabNames.map((name, index) => (
          <Tab
            aria-controls={`tab-${index}`}
            id={`tab-${index}`}
            key={name}
            label={name}
            onClick={() => setTab(index)}
            selected={index === tab}
          />
        ))}
      </Tabs>
      <TabPanel active={tab === 0} id="tab-panel-0" tabId="tab-0">
        <p>This is the red tab content.</p>
      </TabPanel>
      <TabPanel active={tab === 1} id="tab-panel-1" tabId="tab-1">
        <p>This is the green tab content.</p>
      </TabPanel>
      <TabPanel active={tab === 2} id="tab-panel-2" tabId="tab-2">
        <p>This is the blue tab content.</p>
      </TabPanel>
    </>
  );
};

export const Default = Template.bind({});
