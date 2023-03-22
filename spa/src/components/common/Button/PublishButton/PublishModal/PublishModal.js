import { useState } from 'react';
import PropTypes from 'prop-types';
import { CircularProgress, Divider, Grid } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import PublicIcon from '@material-ui/icons/Public';

import {
  Flex,
  Title,
  Paper,
  Modal,
  Icon,
  IconButton,
  Content,
  Label,
  Input,
  UnderText,
  Actions,
  PublishButton,
  CancelButton
} from './PublishModal.styled';
import getDomain from 'utilities/getDomain';
import { PagePropTypes } from 'constants/propTypes';
import slugify from 'utilities/slugify';

const PublishModal = ({ open, onClose, onPublish, page, loading }) => {
  const [slug, setSlug] = useState(page?.slug ?? '');
  const domain = getDomain(window.location.host);

  const domainUrl = `.${domain}/`;

  const handleChangeSlug = (event) => {
    setSlug(slugify(event.target.value ?? ''));
  };

  const handlePublish = () => {
    onPublish({ slug });
  };

  return (
    <Modal open={open} onClose={onClose} aria-label={`Publish page ${page?.name}`}>
      <Paper>
        <IconButton onClick={onClose}>
          <Icon type="grey">
            <CloseIcon />
          </Icon>
        </IconButton>
        <Flex>
          <PublicIcon />
          <Title>Publish Page</Title>
        </Flex>
        <Divider />
        <Content>
          <p style={{ margin: 0 }}>
            Your URL is where contributors will access your contribution page. Fill out the fields to create your
            contribution page link.
          </p>
          <Grid container>
            <Grid item xs={4}>
              <Label>Site Name*</Label>
            </Grid>
            <Grid item xs={3} />
            <Grid item xs={5}>
              <Label>Page Name</Label>
            </Grid>
            <Grid item xs={4}>
              <Input value={page?.revenue_program?.slug} start="true" readOnly />
            </Grid>
            <Grid item xs={3}>
              <Input disabled defaultValue={domainUrl} center="true" aria-label="Domain URL" />
            </Grid>
            <Grid item xs={5}>
              <Input
                data-testid="page-name-input"
                placeholder="Ex. contribute, donate, join"
                end="true"
                value={slug}
                onChange={handleChangeSlug}
                aria-label="Page name"
              />
            </Grid>
            <Grid item xs={5}>
              <UnderText>*Site name can’t be changed upon publish.</UnderText>
            </Grid>
            <Grid item xs={2} />
            <Grid item xs={5}>
              {/* TODO: add input error messages */}
            </Grid>
          </Grid>
          <Actions>
            <CancelButton variant="contained" onClick={onClose} disableElevation>
              Cancel
            </CancelButton>
            <PublishButton
              data-testid="modal-publish-button"
              variant="contained"
              onClick={handlePublish}
              disableElevation
              disabled={!slug || loading}
            >
              {loading ? <CircularProgress size={16} style={{ color: 'white' }} /> : 'Publish'}
            </PublishButton>
          </Actions>
        </Content>
      </Paper>
    </Modal>
  );
};

PublishModal.propTypes = {
  className: PropTypes.string,
  page: PropTypes.shape(PagePropTypes).isRequired,
  open: PropTypes.bool,
  loading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onPublish: PropTypes.func.isRequired
};

PublishModal.defaultProps = {
  className: '',
  loading: false,
  open: false
};

export default PublishModal;
