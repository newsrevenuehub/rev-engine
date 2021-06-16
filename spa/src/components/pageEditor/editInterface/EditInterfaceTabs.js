import * as S from './EditInterfaceTabs.styled';

const TABS = ['Layout', 'Setup'];

function EditInterfaceTabs({ tab, setTab }) {
  return (
    <S.EditInterfaceTabs>
      {TABS.map((tabName, i) => (
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
