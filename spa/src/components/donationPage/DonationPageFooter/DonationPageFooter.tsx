import PropTypes, { InferProps } from 'prop-types';
import { useTranslation } from 'react-i18next';
import { HOME_PAGE_URL } from 'constants/helperUrls';
import { ContributionPage } from 'hooks/useContributionPage';
import { Content, Root } from './DonationPageFooter.styled';

const DonationPageFooterPropTypes = {
  page: PropTypes.object
};

export interface DonationPageFooterProps extends InferProps<typeof DonationPageFooterPropTypes> {
  page?: ContributionPage;
}

function DonationPageFooter({ page }: DonationPageFooterProps) {
  const { t } = useTranslation();

  return (
    <Root data-testid="donation-page-footer">
      <Content>
        <a href={HOME_PAGE_URL} target="_blank">
          {t('donationPage.donationPageFooter.whatIsFundJournalismOrg')}
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
