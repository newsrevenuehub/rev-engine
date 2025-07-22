import { Link } from 'components/base';
import Hero from 'components/common/Hero';
import EmailBlock, { EmailBlockProps } from './EmailBlock';
import { Blocks } from './EmailsRoute.styled';
import PageTitle from 'elements/PageTitle';
import { TestEmailName, useTestEmails } from 'hooks/useTestEmails';
import { EMAIL_CANCELATION_KB_URL, EMAIL_KB_URL, EMAIL_PAYMENT_CHANGE_KB_URL } from 'constants/helperUrls';
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
    emailType: 'contribution_receipt',
    description:
      'Receipts are sent for all contributions after a successful payment. The receipts thank the contributor for their contribution, confirm payment, and provide tax information. Contributors can also resend receipts to themselves in the contributor portal.',
    name: 'Receipt',
    testEmailName: 'receipt'
  },
  {
    disabled: true,
    editable: true,
    description: (
      <>
        These emails are sent when a contribution is canceled for any reason—by the contributor, by the org, or by the
        payment processor (when a payment method fails).{' '}
        <Link href={EMAIL_CANCELATION_KB_URL} target="_blank">
          Show Preview
        </Link>
      </>
    ),
    hideActions: true,
    name: 'Cancelation'
  },
  {
    disabled: true,
    editable: true,
    description:
      'For contributors with recurring annual contributions, a payment reminder is sent 7 days before their contribution renews. This time period can be configured within your organization’s Stripe account.',
    name: 'Payment Reminder',
    testEmailName: 'reminder'
  },
  {
    disabled: true,
    editable: false,
    description:
      "A failed payment notification email is sent when RevEngine's payment processor cannot charge the payment method of a contribution, which could be due to incorrect payment information or expired cards.",
    name: 'Payment Failed'
  },
  {
    description: (
      <>
        A payment change confirmation email is sent when a contributor successfully makes changes to an active recurring
        contribution, like changing the payment method, amount, and/or frequency.{' '}
        <Link href={EMAIL_PAYMENT_CHANGE_KB_URL} target="_blank">
          Show Preview
        </Link>
      </>
    ),
    hideActions: true,
    name: 'Payment Change Confirmation'
  },
  {
    disabled: true,
    description:
      'Contributors can access the contributor portal to manage their contributions to your organization, and are granted access through a secure magic link sent via email.',
    name: 'Magic Link',
    testEmailName: 'magic_link'
  }
];

export function EmailsRoute() {
  const { user } = useUser();

  const { sendTestEmail } = useTestEmails();
  const firstRevenueProgramId = useMemo(() => {
    if (user?.revenue_programs) {
      return user.revenue_programs[0].id;
    }
  }, [user?.revenue_programs]);
  const orgPlan = useMemo(() => user?.organizations[0].plan.name, [user?.organizations]);
  const prompt = orgPlan === 'FREE' ? '' : 'View and edit capabilities coming soon.';
  const isFreeOrg = !orgPlan || orgPlan === PLAN_NAMES.FREE;

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
        subtitle={`RevEngine sends emails to your contributors to confirm transactions and keep them informed about their contributions. ${prompt}`}
      />
      <Blocks>
        {blocks.map((block) => (
          <EmailBlock
            description={block.description}
            disabled={block.disabled || isFreeOrg}
            editable={block.editable}
            emailType={block.emailType}
            hideActions={block.hideActions}
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
