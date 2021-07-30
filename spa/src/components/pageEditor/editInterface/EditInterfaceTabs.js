import * as S from './EditInterfaceTabs.styled';

export const EDIT_INTERFACE_TABS = ['Layout', 'Setup', 'Styles'];

function EditInterfaceTabs({ tab, setTab }) {
  return (
    <S.EditInterfaceTabs>
      {EDIT_INTERFACE_TABS.map((tabName, i) => (
        <S.Tab
          key={tabName + i}
          selected={i === tab}
          onClick={() => setTab(i)}
          data-testid={`${tabName.toLowerCase()}-tab`}
        >
          {tabName}
        </S.Tab>
      ))}
    </S.EditInterfaceTabs>
  );
}

export default EditInterfaceTabs;
