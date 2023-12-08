import { Button } from 'components/base';
import { Root } from './GenericErrorFallback.styled';
import { RefreshOutlined } from '@material-ui/icons';

function GenericErrorFallback() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <Root>
      Something went wrong loading this part of the page.{' '}
      <Button color="secondary" onClick={handleReload}>
        <RefreshOutlined />
        Reload
      </Button>
    </Root>
  );
}

export default GenericErrorFallback;
