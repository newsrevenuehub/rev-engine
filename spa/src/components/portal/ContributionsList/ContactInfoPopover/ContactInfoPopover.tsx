import QuestionMarkIcon from '@material-design-icons/svg/filled/question_mark.svg?react';
import LocalPhoneOutlinedIcon from '@material-ui/icons/LocalPhoneOutlined';
import MailOutlinedIcon from '@material-ui/icons/MailOutlined';
import PropTypes, { InferProps } from 'prop-types';
import { useCallback, useState } from 'react';
import { Link } from 'components/base';
import { ArrowPopover } from 'components/common/ArrowPopover';
import { RevenueProgramForContributionPage } from 'hooks/useContributionPage';
import {
  ContactInfoButton,
  ContactInfoDetails,
  ContactRow,
  ContactTypography,
  TitleTypography
} from './ContactInfoPopover.styled';

export interface ContactInfoPopoverProps extends InferProps<typeof ContactInfoPopoverPropTypes> {
  revenueProgram?: RevenueProgramForContributionPage;
}

const ContactInfoPopover = ({ revenueProgram }: ContactInfoPopoverProps) => {
  const hasContactInfo = revenueProgram?.contact_email || revenueProgram?.contact_phone;

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const showContactInfoPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  if (!hasContactInfo) {
    return null;
  }

  return (
    <>
      <ContactInfoButton
        color="primaryDark"
        onClick={showContactInfoPopover}
        aria-label={`${!!anchorEl ? 'Close' : 'Open'} contact info`}
      >
        <QuestionMarkIcon />
      </ContactInfoButton>
      <ArrowPopover anchorEl={anchorEl} onClose={() => setAnchorEl(null)} open={!!anchorEl} placement="top">
        <TitleTypography>Need help?</TitleTypography>
        <ContactTypography>Contact us:</ContactTypography>
        <ContactInfoDetails>
          {revenueProgram.contact_phone && (
            <ContactRow>
              <LocalPhoneOutlinedIcon />
              <p>
                Phone: <Link href={`tel:${revenueProgram.contact_phone}`}>{revenueProgram.contact_phone}</Link>
              </p>
            </ContactRow>
          )}
          {revenueProgram.contact_email && (
            <ContactRow>
              <MailOutlinedIcon />
              <p>
                Email: <Link href={`mailto:${revenueProgram.contact_email}`}>{revenueProgram.contact_email}</Link>
              </p>
            </ContactRow>
          )}
        </ContactInfoDetails>
      </ArrowPopover>
    </>
  );
};

const ContactInfoPopoverPropTypes = {
  revenueProgram: PropTypes.object
};

ContactInfoPopover.propTypes = ContactInfoPopoverPropTypes;

export default ContactInfoPopover;
