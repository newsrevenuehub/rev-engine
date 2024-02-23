import { Skeleton } from '@material-ui/lab';
import { DetailSection } from '../DetailSection';
import { Content } from '../ContributionDetail.styled';

export function LoadingSkeleton() {
  return (
    <Content data-testid="loading-skeleton">
      <DetailSection title={<Skeleton variant="text" width={100} />}>
        <Skeleton variant="rect" height={140} />
      </DetailSection>
      <DetailSection title={<Skeleton variant="text" width={100} />}>
        <Skeleton variant="rect" height={140} />
      </DetailSection>
    </Content>
  );
}

export default LoadingSkeleton;
