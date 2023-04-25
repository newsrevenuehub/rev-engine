import PropTypes, { InferProps } from 'prop-types';
import { Content, Root } from './DonationPageFooter.styled';
import { HOME_PAGE_URL } from 'constants/helperUrls';
import { ContributionPage } from 'hooks/useContributionPage';

const DonationPageFooterPropTypes = {
  page: PropTypes.object
};

export interface DonationPageFooterProps extends InferProps<typeof DonationPageFooterPropTypes> {
  page?: ContributionPage;
}

function DonationPageFooter({ page }: DonationPageFooterProps) {
  return (
    <Root data-testid="donation-page-footer">
      <Content>
        {/* eslint-disable-next-line react/jsx-no-target-blank */}
        <a href={HOME_PAGE_URL} target="_blank">
          What is fundjournalism.org?
        </a>
        <p>
          &copy; {new Date().getFullYear()} {page?.revenue_program.name}
        </p>
      </Content>
    </Root>
  );
}

DonationPageFooter.propTypes = DonationPageFooterPropTypes;
export default DonationPageFooter;
