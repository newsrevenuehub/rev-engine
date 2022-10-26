import { Tab, Tabs } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';

export const EDIT_INTERFACE_TAB_NAMES = ['Layout', 'Sidebar', 'Settings'];

const EditInterfaceTabsPropTypes = {
  onChangeTab: PropTypes.func.isRequired,
  tab: PropTypes.number.isRequired
};

export interface EditInterfaceTabsProps extends InferProps<typeof EditInterfaceTabsPropTypes> {
  onChangeTab: (tabIndex: number) => void;
}

function EditInterfaceTabs({ tab, onChangeTab }: EditInterfaceTabsProps) {
  return (
    <Tabs value={tab}>
      {EDIT_INTERFACE_TAB_NAMES.map((tabName, index) => (
        <Tab
          aria-controls={`edit-${tabName.toLowerCase()}-tab-panel}`}
          data-testid={`edit-${tabName.toLowerCase()}-tab`}
          id={`edit-${tabName.toLowerCase()}-tab`}
          key={tabName + index}
          label={tabName}
          onClick={() => onChangeTab(index)}
        />
      ))}
    </Tabs>
  );
}

EditInterfaceTabs.propTypes = EditInterfaceTabsPropTypes;

export default EditInterfaceTabs;
