import * as S from './EditInterfaceTabs.styled';

const TABS = ['Layout', 'Setup'];

function EditInterfaceTabs({ tab, setTab }) {
  return (
    <S.EditInterfaceTabs>
      {TABS.map((tabName, i) => (
        <S.Tab key={tabName + i} selected={i === tab} onClick={() => setTab(i)}>
          {tabName}
        </S.Tab>
      ))}
    </S.EditInterfaceTabs>
  );
}

export default EditInterfaceTabs;
