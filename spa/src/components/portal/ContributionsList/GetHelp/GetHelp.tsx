import LocalPhoneOutlinedIcon from '@material-ui/icons/LocalPhoneOutlined';
import MailOutlinedIcon from '@material-ui/icons/MailOutlined';
import { Link } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { ContactInfoDetails, ContactRow, ContactTypography, TitleTypography, LabelWrapper } from './GetHelp.styled';

export type GetHelpProps = InferProps<typeof GetHelpPropTypes>;

const GetHelp = ({ contact_email, contact_phone }: GetHelpProps) => {
  return (
    <>
      <TitleTypography>Need help?</TitleTypography>
      <ContactTypography>Contact us:</ContactTypography>
      <ContactInfoDetails>
        {contact_phone && (
          <ContactRow>
            <LabelWrapper>
              <LocalPhoneOutlinedIcon />
              <p>Phone:</p>
            </LabelWrapper>
            <Link href={`tel:${contact_phone}`}>{contact_phone}</Link>
          </ContactRow>
        )}
        {contact_email && (
          <ContactRow>
            <LabelWrapper>
              <MailOutlinedIcon />
              <p>Email:</p>
            </LabelWrapper>
            <Link href={`mailto:${contact_email}`}>{contact_email}</Link>
          </ContactRow>
        )}
      </ContactInfoDetails>
    </>
  );
};

const GetHelpPropTypes = {
  contact_email: PropTypes.string,
  contact_phone: PropTypes.string
};

GetHelp.propTypes = GetHelpPropTypes;

export default GetHelp;
