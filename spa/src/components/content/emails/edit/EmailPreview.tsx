import PropTypes, { InferProps } from 'prop-types';
import { useMemo } from 'react';
import { RevenueProgram } from 'hooks/useContributionPage';
import {
  Details,
  BodyText,
  Heading,
  Root,
  Subheading,
  FakeLink,
  Footer,
  RevenueProgramStatus,
  Logo
} from './EmailPreview.styled';

const EmailPreviewPropTypes = {
  children: PropTypes.node,
  revenueProgram: PropTypes.object.isRequired
};

export interface EmailPreviewProps extends InferProps<typeof EmailPreviewPropTypes> {
  revenueProgram: RevenueProgram;
}

export function EmailPreview({ children, revenueProgram }: EmailPreviewProps) {
  // Prevent the date from updating across renders.
  const now = useMemo(() => new Date(), []);

  return (
    <Root>
      <Logo />
      <Heading>Thank You For Your Contribution!</Heading>
      <BodyText>Dear [FIRST NAME] [LAST NAME],</BodyText>
      {children}
      <Details>
        <Subheading>Contribution Details</Subheading>
        <BodyText>
          <strong>Date Received:</strong>{' '}
          {now.toLocaleDateString(undefined, {
            day: '2-digit',
            hour: '2-digit',
            hour12: false,
            minute: '2-digit',
            month: '2-digit',
            year: '2-digit',
            timeZoneName: 'short'
          })}
        </BodyText>
        <BodyText>
          <strong>Email:</strong> <FakeLink>no-reply@fundjournalism.org</FakeLink>
        </BodyText>
        <BodyText>
          <strong>Amount Contributed:</strong> $15.00 USD/month
        </BodyText>
      </Details>
      <RevenueProgramStatus data-testid="rp-status">
        No goods or services were provided in exchange for this contribution.
        {['nonprofit', 'fiscally sponsored'].includes(revenueProgram.fiscal_status) && (
          <>
            {' '}
            This receipt may be used for tax purposes.
            {revenueProgram.fiscal_status === 'nonprofit' && (
              <>
                {' ' + revenueProgram.name} is a 501(c)(3) nonprofit{' '}
                {revenueProgram.tax_id ? (
                  <>organization with a Federal Tax ID #{revenueProgram.tax_id}.</>
                ) : (
                  <>organization.</>
                )}
              </>
            )}
            {revenueProgram.fiscal_status === 'fiscally sponsored' && (
              <>
                {' '}
                All contributions or gifts to {revenueProgram.name} are tax deductible through our fiscal sponsor{' '}
                {revenueProgram.fiscal_sponsor_name}. {revenueProgram.fiscal_sponsor_name}'s tax ID is{' '}
                {revenueProgram.tax_id}.
              </>
            )}
          </>
        )}
        {revenueProgram.fiscal_status === 'for-profit' && (
          <>Contributions to {revenueProgram.name} are not deductible as charitable donations.</>
        )}
      </RevenueProgramStatus>
      <Footer>
        <p>
          <strong>
            Need to make changes to your contribution? <FakeLink>Manage contributions here</FakeLink>
          </strong>
        </p>
        <p>
          &copy; {now.getFullYear()} {revenueProgram.name}
        </p>
      </Footer>
    </Root>
  );
}

EmailPreview.propTypes = EmailPreviewPropTypes;
export default EmailPreview;
