import { RevenueProgram } from 'hooks/useContributionPage';
import { EmailCustomization } from 'hooks/useEmailCustomizations';

const defaults: Record<
  EmailCustomization['email_type'],
  Record<EmailCustomization['email_block'], string | ((revenueProgram: RevenueProgram) => string)>
> = {
  contribution_receipt: {
    message: (revenueProgram) => `<p>Thank you for supporting ${revenueProgram.name}.</p>`
  }
};

export function defaultEmailContent(
  emailType: EmailCustomization['email_type'],
  emailBlock: EmailCustomization['email_block'],
  revenueProgram: RevenueProgram
) {
  const value = defaults[emailType][emailBlock];

  if (typeof value === 'function') {
    return value(revenueProgram);
  }

  return value;
}
