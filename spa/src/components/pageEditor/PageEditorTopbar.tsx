import logoBlue from 'assets/images/nre-logo-blue.svg';
import GrabLink from 'components/common/Button/GrabLink';
import PublishButton from 'components/common/Button/PublishButton';
import { useEditablePageContext } from 'hooks/useEditablePage';
import { Group, Root, SvgLogo } from './PageEditorTopbar.styled';
import PageName from './PageName';
import { BackButton } from './BackButton';

function PageEditorTopbar() {
  const { pageChanges } = useEditablePageContext();
  const changesPending = Object.keys(pageChanges).length !== 0;

  return (
    <Root>
      <Group>
        <BackButton changesPending={changesPending} />
        <SvgLogo src={logoBlue} alt="News Revenue Hub" />
        <PageName />
      </Group>
      <Group>
        <GrabLink />
        <PublishButton />
      </Group>
    </Root>
  );
}

export default PageEditorTopbar;
