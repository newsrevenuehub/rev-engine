import { Link } from 'components/base';
import { KNOWLEDGE_BASE_URL } from 'constants/helperUrls';
import { Root } from './Instructions.styled';

export function Instructions() {
  return (
    <Root>
      Follow the instructions to connect RevEngine to ActiveCampaign. Need help?{' '}
      <Link href={KNOWLEDGE_BASE_URL} target="_blank">
        Visit our knowledge base.
      </Link>
    </Root>
  );
}

export default Instructions;
