import PropTypes, { InferProps } from 'prop-types';

const TabPanelPropTypes = {
  active: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  dontRenderChildrenWhenInactive: PropTypes.bool,
  'data-testid': PropTypes.string,
  id: PropTypes.string.isRequired,
  tabId: PropTypes.string.isRequired,
  unmountChildrenWhenInactive: PropTypes.bool
};

export type TabPanelProps = InferProps<typeof TabPanelPropTypes>;

export function TabPanel({
  active,
  children,
  className,
  'data-testid': testId,
  id,
  tabId,
  unmountChildrenWhenInactive
}: TabPanelProps) {
  return (
    <div aria-labelledby={tabId} className={className!} data-testid={testId} hidden={!active} id={id} role="tabpanel">
      {(active || !unmountChildrenWhenInactive) && children}
    </div>
  );
}

TabPanel.propTypes = TabPanelPropTypes;

export default TabPanel;
