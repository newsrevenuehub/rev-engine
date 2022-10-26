import PropTypes, { InferProps } from 'prop-types';

const TabPanelPropTypes = {
  active: PropTypes.bool,
  children: PropTypes.node.isRequired,
  'data-testid': PropTypes.string,
  id: PropTypes.string.isRequired,
  tabId: PropTypes.string.isRequired
};

export type TabPanelProps = InferProps<typeof TabPanelPropTypes>;

export function TabPanel({ active, children, 'data-testid': testId, id, tabId }: TabPanelProps) {
  return (
    <div aria-labelledby={tabId} data-testid={testId} hidden={!active} id={id} role="tabpanel">
      {children}
    </div>
  );
}

TabPanel.propTypes = TabPanelPropTypes;

export default TabPanel;
