import GraphIcon from '@material-design-icons/svg/filled/auto_graph.svg?react';
import PropTypes, { InferProps } from 'prop-types';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { ContributionWrapper, ImpactWrapper, Subtitle, Title, TotalText, TitleWrapper } from './ImpactTracker.styled';
import { PortalImpact } from 'hooks/usePortalContributorImpact';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import { Tooltip } from 'components/base';

export interface ImpactTrackerProps extends InferProps<typeof ImpactTrackerPropTypes> {
  impact?: PortalImpact;
}

const ImpactTracker = ({ impact }: ImpactTrackerProps) => {
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
  impact: PropTypes.object
};

ImpactTracker.propTypes = ImpactTrackerPropTypes;

export default ImpactTracker;
