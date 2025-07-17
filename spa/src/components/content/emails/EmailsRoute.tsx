import { Link } from 'components/base';
import Hero from 'components/common/Hero';
import EmailBlock, { EmailBlockProps } from './EmailBlock';
import { Blocks } from './EmailsRoute.styled';
import PageTitle from 'elements/PageTitle';
import { TestEmailName, useTestEmails } from 'hooks/useTestEmails';
import { EMAIL_KB_URL } from 'constants/helperUrls';
import useUser from 'hooks/useUser';
import { useMemo } from 'react';
import { PLAN_NAMES } from 'constants/orgPlanConstants';

interface EmailBlock extends Omit<EmailBlockProps, 'onSendTest'> {
  testEmailName?: TestEmailName;
}

// Exporting for testing only.
export const blocks: EmailBlock[] = [
  {
    editable: true,
    description:
      'Receipts are sent for all contributions after a successful payment. The receipts thank the contributor for their contribution, confirm payment, and provide tax information. Contributors can also resend receipts to themselves in the contributor portal.',
    name: 'Receipts',
    testEmailName: 'receipt'
  },
  {
    editable: true,
    description:
      'A canceled contribution email is sent when a contribution is canceled for any reason; this includes the contributor or the organization canceling, or RevEngine’s payment processor canceling due to an expired or failed payment method.',
    name: 'Canceled'
  },
  {
    editable: true,
    description:
      'For contributors with recurring annual contributions, a payment reminder is sent 7 days before their contribution renews. This time period can be configured within your organization’s Stripe account.',
    name: 'Payment Reminders',
    testEmailName: 'reminder'
  },
  {
    editable: false,
    description:
      "A failed payment notification email is sent when RevEngine's payment processor cannot charge the payment method of a contribution, which could be due to incorrect payment information or expired cards.",
    name: 'Failed'
  },
  {
    description:
      'A payment change confirmation email is sent when a contributor successfully makes changes to an active recurring contribution, like changing the payment method, amount, and/or frequency.',
    name: 'Payment Changes Confirmation'
  },
  {
    description:
      'Contributors can access the contributor portal to manage their contributions to your organization, and are granted access through a secure magic link sent via email.',
    name: 'Magic Link',
    testEmailName: 'magic_link'
  }
];

export function EmailsRoute() {
  const { user } = useUser();
  const isFreeOrg = user?.organizations?.[0]?.plan?.name === PLAN_NAMES.FREE;
  const { sendTestEmail } = useTestEmails();
  const firstRevenueProgramId = useMemo(() => {
    if (user?.revenue_programs) {
      return user.revenue_programs[0].id;
    }
  }, [user?.revenue_programs]);

  function handleSendTest(emailName: TestEmailName) {
    if (!firstRevenueProgramId) {
      // Should never happen.

      throw new Error('User has no revenue programs');
    }

    sendTestEmail({ emailName, revenueProgramId: firstRevenueProgramId });
  }

  return (
    <>
      <PageTitle title="Emails" />
      <Hero
        cornerContent={
          <Link external href={EMAIL_KB_URL} target="_blank">
            More About Emails
          </Link>
        }
        title="Emails"
        subtitle="RevEngine sends emails to your contributors to confirm transactions and keep them informed about their contributions. View, edit, or customize emails sent to your organization's contributors."
      />
      <Blocks>
        {blocks.map((block) => (
          <EmailBlock
            description={block.description}
            editable={block.editable && !isFreeOrg}
            key={block.name}
            name={block.name}
            onSendTest={
              block.testEmailName && firstRevenueProgramId ? () => handleSendTest(block.testEmailName!) : undefined
            }
          />
        ))}
      </Blocks>
    </>
  );
}

export default EmailsRoute;
