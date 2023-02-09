import { useState } from 'react';
import PropTypes from 'prop-types';
import { Divider } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import LaunchIcon from '@material-ui/icons/Launch';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';

import { DONATIONS_SLUG } from 'routes';
import { PagePropTypes } from 'constants/propTypes';
import CopyInputButton from 'components/common/Button/CopyInputButton';
import { pageLink, portalLink } from 'utilities/getPageLinks';

import {
  Flex,
  Title,
  Paper,
  Modal,
  Icon,
  IconButton,
  Content,
  Actions,
  ContributionButton,
  GoToButton
} from './SuccessfulPublishModal.styled';

const SuccessfulPublishModal = ({ open, onClose, page }) => {
  const [copied, setCopied] = useState('');

  return (
    <Modal open={open} onClose={onClose} aria-label={`Successfully published page ${page?.name}`}>
      <Paper>
        <IconButton onClick={onClose} aria-label="Close modal">
          <Icon type="grey">
            <CloseIcon />
          </Icon>
        </IconButton>
        <Flex>
          <CheckCircleOutlineIcon />
          <Title data-testid="page-creation-success-evidence">Successfully Published Page</Title>
        </Flex>
        <Divider />
        <Content>
          <p style={{ margin: 0 }}>
            Your page was successfully published. Copy the link below to update your website, emails, and other online
            platforms.
          </p>
          <CopyInputButton
            title="Contribution Page Link"
            link={pageLink(page)}
            copied={copied}
            setCopied={setCopied}
            data-testid="copy-contribution-page-link"
          />
          <Divider />
          <p style={{ margin: 0 }}>
            The Contributor Portal link is where your contributors can view, edit, and manage their contributions.
          </p>
          <CopyInputButton
            title="Contributor Portal Link"
            link={portalLink(page)}
            copied={copied}
            setCopied={setCopied}
          />
          <Actions>
            <GoToButton
              endIcon={<LaunchIcon />}
              variant="contained"
              component="a"
              disableElevation
              href={`//${pageLink(page)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
            >
              Go to page
            </GoToButton>
            <ContributionButton variant="contained" disableElevation href={DONATIONS_SLUG} component="a">
              View contributions
            </ContributionButton>
          </Actions>
        </Content>
      </Paper>
    </Modal>
  );
};

SuccessfulPublishModal.propTypes = {
  className: PropTypes.string,
  page: PropTypes.shape(PagePropTypes).isRequired,
  open: PropTypes.bool,
  loading: PropTypes.bool,
  onClose: PropTypes.func.isRequired
};

SuccessfulPublishModal.defaultProps = {
  className: '',
  loading: false,
  open: false
};

export default SuccessfulPublishModal;
