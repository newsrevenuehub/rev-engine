import QuestionMarkIcon from '@material-design-icons/svg/filled/question_mark.svg?react';
import { ArrowPopover } from 'components/common/ArrowPopover';
import { RevenueProgram, RevenueProgramWithFullOrganization } from 'hooks/useContributionPage';
import PropTypes, { InferProps } from 'prop-types';
import { useCallback, useState } from 'react';
import { ContactInfoButton } from './DesktopContactInfoPopover.styled';
import GetHelp from '../GetHelp/GetHelp';

export interface DesktopContactInfoPopoverProps extends InferProps<typeof DesktopContactInfoPopoverPropTypes> {
  revenueProgram?: RevenueProgram | RevenueProgramWithFullOrganization;
}

const DesktopContactInfoPopover = ({ revenueProgram }: DesktopContactInfoPopoverProps) => {
  const hasContactInfo = revenueProgram?.contact_email || revenueProgram?.contact_phone;

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const showDesktopContactInfoPopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  if (!hasContactInfo) {
    return null;
  }

  return (
    <>
      <ContactInfoButton
        color="primaryDark"
        onClick={showDesktopContactInfoPopover}
        aria-label={`${!!anchorEl ? 'Close' : 'Open'} contact info`}
      >
        <QuestionMarkIcon />
      </ContactInfoButton>
      <ArrowPopover anchorEl={anchorEl} onClose={() => setAnchorEl(null)} open={!!anchorEl} placement="top">
        <GetHelp contact_email={revenueProgram?.contact_email} contact_phone={revenueProgram?.contact_phone} />
      </ArrowPopover>
    </>
  );
};

const DesktopContactInfoPopoverPropTypes = {
  revenueProgram: PropTypes.object
};

DesktopContactInfoPopover.propTypes = DesktopContactInfoPopoverPropTypes;

export default DesktopContactInfoPopover;
