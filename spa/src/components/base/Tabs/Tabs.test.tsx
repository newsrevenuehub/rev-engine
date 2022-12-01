import { axe } from 'jest-axe';
import { useState } from 'react';
import { render } from 'test-utils';
import Tab from './Tab';
import TabPanel from './TabPanel';
import Tabs from './Tabs';

const TabDemo = () => {
  const [tab, setTab] = useState(0);

  return (
    <>
      <Tabs aria-label="Demo Tabs" value={tab}>
        <Tab aria-controls="tabpanel0" id="tab0" label={0} onClick={() => setTab(0)} selected={tab === 0} />
        <Tab aria-controls="tabpanel1" id="tab1" label={1} onClick={() => setTab(1)} selected={tab === 1} />
      </Tabs>
      <TabPanel active={tab === 0} id="tabpanel0" tabId="tab0">
        tabpanel0
      </TabPanel>
      <TabPanel active={tab === 1} id="tabpanel1" tabId="tab1">
        <p>This is the green tab content.</p>
      </TabPanel>
    </>
  );
};

describe('Tabs', () => {
  it('is accessible', async () => {
    const { container } = render(<TabDemo />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
