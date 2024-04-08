import QuestionMarkIcon from '@material-design-icons/svg/filled/question_mark.svg?react';
import LocalPhoneOutlinedIcon from '@material-ui/icons/LocalPhoneOutlined';
import MailOutlinedIcon from '@material-ui/icons/MailOutlined';
import { ArrowPopover } from 'components/common/ArrowPopover';
import PropTypes, { InferProps } from 'prop-types';
import { useCallback, useState } from 'react';
import {
  ContactInfoButton,
  ContactInfoDetails,
  ContactRow,
  ContactTypography,
  StyledLink,
  TitleTypography
} from './ContactInfoPopover.styled';
import { ContributionPage } from 'hooks/useContributionPage';

interface ContactInfoPopoverProps extends InferProps<typeof ContactInfoPopoverPropTypes> {
  page?: ContributionPage;
}

const ContactInfoPopover = ({ page }: ContactInfoPopoverProps) => {
  const hasContactInfo = page?.revenue_program.contact_email || page?.revenue_program.contact_phone;

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const showContactInfoPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  if (!hasContactInfo) {
    return null;
  }

  return (
    <>
      <ContactInfoButton color="primaryDark" onClick={showContactInfoPopover} aria-label="Open contact info">
        <QuestionMarkIcon />
      </ContactInfoButton>
      <ArrowPopover anchorEl={anchorEl} onClose={() => setAnchorEl(null)} open={!!anchorEl} placement="top">
        <TitleTypography>Need help?</TitleTypography>
        <ContactTypography>Contact us:</ContactTypography>
        <ContactInfoDetails>
          {page?.revenue_program.contact_phone && (
            <ContactRow>
              <LocalPhoneOutlinedIcon />
              <p>
                Phone:{' '}
                <StyledLink href={`tel:${page?.revenue_program.contact_phone}`}>
                  {page?.revenue_program.contact_phone}
                </StyledLink>
              </p>
            </ContactRow>
          )}
          {page?.revenue_program.contact_email && (
            <ContactRow>
              <MailOutlinedIcon />
              <p>
                Email:{' '}
                <StyledLink href={`mailto:${page?.revenue_program.contact_email}`}>
                  {page?.revenue_program.contact_email}
                </StyledLink>
              </p>
            </ContactRow>
          )}
        </ContactInfoDetails>
      </ArrowPopover>
    </>
  );
};

const ContactInfoPopoverPropTypes = {
  page: PropTypes.object
};

ContactInfoPopover.propTypes = ContactInfoPopoverPropTypes;

export default ContactInfoPopover;
export type { ContactInfoPopoverProps };
