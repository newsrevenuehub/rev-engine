import PropTypes, { InferProps } from 'prop-types';
import { Tab } from 'components/base';
import { Tabs } from './EditInterfaceTabs.styled';

export const EDIT_INTERFACE_TAB_NAMES = ['Layout', 'Sidebar', 'Settings', 'Style'];

const EditInterfaceTabsPropTypes = {
  onChangeTab: PropTypes.func.isRequired,
  tab: PropTypes.number.isRequired
};

export interface EditInterfaceTabsProps extends InferProps<typeof EditInterfaceTabsPropTypes> {
  onChangeTab: (tabIndex: number) => void;
}

function EditInterfaceTabs({ tab, onChangeTab }: EditInterfaceTabsProps) {
  return (
    <Tabs value={tab} variant="fullWidth">
      {EDIT_INTERFACE_TAB_NAMES.map((tabName, index) => (
        <Tab
          aria-controls={`edit-${tabName.toLowerCase()}-tab-panel`}
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
