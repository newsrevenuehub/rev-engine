import Icon from '@material-design-icons/svg/filled/more_horiz.svg?react';
import ContactSupportIcon from '@material-design-icons/svg/outlined/contact_support.svg?react';
import DiversityIcon from '@material-design-icons/svg/outlined/diversity_2.svg?react';
import CloseIcon from '@material-design-icons/svg/filled/close.svg?react';
import { RevenueProgram, RevenueProgramWithFullOrganization } from 'hooks/useContributionPage';
import PropTypes, { InferProps } from 'prop-types';
import { useCallback, useState } from 'react';
import {
  ContactInfoButton,
  ListItemIcon,
  ListWrapper,
  MenuItem,
  Popover,
  Typography,
  CloseButton
} from './MobileInfoMenu.styled';
import GetHelp from '../GetHelp/GetHelp';
import { Modal, ModalContent } from 'components/base';
import Appeal from '../Appeal';

export interface MobileInfoMenuProps extends InferProps<typeof MobileInfoMenuPropTypes> {
  revenueProgram?: RevenueProgram | RevenueProgramWithFullOrganization;
}

const MobileInfoMenu = ({ revenueProgram }: MobileInfoMenuProps) => {
  const [showGetHelp, setShowGetHelp] = useState(false);
  const [showAppeal, setShowAppeal] = useState(false);

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const showMobileInfoMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  return (
    <>
      <ContactInfoButton
        color="text"
        onClick={showMobileInfoMenu}
        aria-label={`${!!anchorEl ? 'Close' : 'Open'} information menu`}
      >
        <Icon />
      </ContactInfoButton>
      <Popover
        id="info-menu"
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        open={!!anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <ListWrapper>
          {revenueProgram?.contributor_portal_show_appeal && (
            <MenuItem
              onClick={() => {
                setShowAppeal(true);
                setAnchorEl(null);
              }}
              aria-label="Why giving matters"
            >
              <ListItemIcon>
                <DiversityIcon />
              </ListItemIcon>
              <Typography variant="inherit">Why Giving Matters</Typography>
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              setShowGetHelp(true);
              setAnchorEl(null);
            }}
            aria-label="Get help"
          >
            <ListItemIcon>
              <ContactSupportIcon />
            </ListItemIcon>
            <Typography variant="inherit">Get Help</Typography>
          </MenuItem>
        </ListWrapper>
      </Popover>
      <Modal data-testid="modal-contact-info" open={showGetHelp} onClose={() => setShowGetHelp(false)}>
        <ModalContent>
          <div style={{ position: 'relative' }}>
            <CloseButton color="text" aria-label="Close get help" onClick={() => setShowGetHelp(false)}>
              <CloseIcon />
            </CloseButton>
            <GetHelp contact_email={revenueProgram?.contact_email} contact_phone={revenueProgram?.contact_phone} />
          </div>
        </ModalContent>
      </Modal>
      <Modal data-testid="modal-appeal" open={showAppeal} onClose={() => setShowAppeal(false)}>
        <ModalContent>
          <div style={{ position: 'relative' }}>
            <CloseButton color="text" aria-label="Close why giving matters" onClick={() => setShowAppeal(false)}>
              <CloseIcon />
            </CloseButton>
            <Appeal inModal revenueProgram={revenueProgram} />
          </div>
        </ModalContent>
      </Modal>
    </>
  );
};

const MobileInfoMenuPropTypes = {
  revenueProgram: PropTypes.object
};

MobileInfoMenu.propTypes = MobileInfoMenuPropTypes;

export default MobileInfoMenu;
