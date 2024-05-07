import GraphIcon from '@material-design-icons/svg/filled/auto_graph.svg?react';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import { Tooltip } from 'components/base';
import { usePortalContributorImpact } from 'hooks/usePortalContributorImpact';
import PropTypes, { InferProps } from 'prop-types';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { ContributionWrapper, ImpactWrapper, Subtitle, Title, TitleWrapper, TotalText } from './ImpactTracker.styled';

export interface ImpactTrackerProps extends InferProps<typeof ImpactTrackerPropTypes> {
  contributorId?: number;
}

const ImpactTracker = ({ contributorId }: ImpactTrackerProps) => {
  const { impact, isLoading: isLoadingImpact } = usePortalContributorImpact(contributorId);

  if (isLoadingImpact) {
    return null;
  }

  return (
    <ImpactWrapper>
      <TitleWrapper>
        <GraphIcon />
        <Title>Impact Tracker</Title>
      </TitleWrapper>
      <ContributionWrapper>
        <Subtitle>
          Contributed to Date
          <Tooltip
            placement="top"
            title="Your total contributions given through RevEngine. Other contributions and fees are not reflected."
          >
            <InfoOutlinedIcon />
          </Tooltip>
        </Subtitle>
        <TotalText>{formatCurrencyAmount(impact?.total ?? 0)}</TotalText>
      </ContributionWrapper>
    </ImpactWrapper>
  );
};

const ImpactTrackerPropTypes = {
  contributorId: PropTypes.number
};

ImpactTracker.propTypes = ImpactTrackerPropTypes;

export default ImpactTracker;
