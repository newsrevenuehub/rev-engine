import { Link } from 'components/base';
import { KNOWLEDGE_BASE_URL } from 'constants/helperUrls';

export function Instructions() {
  return (
    <p>
      Follow the instructions to connect RevEngine to ActiveCampaign. Need help?{' '}
      <Link href={KNOWLEDGE_BASE_URL} target="_blank">
        Visit our knowledge base.{' '}
      </Link>
    </p>
  );
}

export default Instructions;
