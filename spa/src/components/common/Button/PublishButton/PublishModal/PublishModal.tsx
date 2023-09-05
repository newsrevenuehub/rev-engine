import { useState, FormEvent } from 'react';
import PropTypes, { InferProps } from 'prop-types';
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
import { ContributionPage } from 'hooks/useContributionPage';

const PublishModalPropTypes = {
  className: PropTypes.string,
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onPublish: PropTypes.func.isRequired,
  page: PropTypes.shape(PagePropTypes).isRequired,
  loading: PropTypes.bool,
  errors: PropTypes.object
};

export interface PublishModalProps extends InferProps<typeof PublishModalPropTypes> {
  onClose: () => void;
  onPublish: ({ slug }: { slug: string }) => void;
  page: ContributionPage;
  errors?: Record<string, string>;
}

export function PublishModal({ open, onClose, onPublish, page, loading, errors }: PublishModalProps) {
  // If the page has a default slug (see <AddPage>), default the field to an
  // empty value.
  const [slug, setSlug] = useState(
    new RegExp(`${page?.revenue_program.name}-page-(\\d+)`, 'i').test(page?.slug) ? '' : page?.slug
  );
  const domain = getDomain(window.location.host);

  const domainUrl = `.${domain}/`;

  const handleChangeSlug = (event: FormEvent) => {
    const element = event.target as HTMLInputElement;
    setSlug(slugify(element.value ?? ''));
  };

  const handlePublish = () => {
    onPublish({ slug });
  };

  return (
    <Modal open={!!open} onClose={onClose} aria-label={`Publish page ${page?.name}`}>
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
              <Input value={page?.revenue_program?.slug} readOnly className="start" />
            </Grid>
            <Grid item xs={3}>
              <Input disabled defaultValue={domainUrl} aria-label="Domain URL" className="center" />
            </Grid>
            <Grid item xs={5}>
              <Input
                className="end"
                error={!!errors?.slug}
                data-testid="page-name-input"
                placeholder="Ex. contribute, donate, join"
                helperText={errors?.slug ?? ''}
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
              disabled={!slug ?? loading}
            >
              {loading ? <CircularProgress size={16} style={{ color: 'white' }} /> : 'Publish'}
            </PublishButton>
          </Actions>
        </Content>
      </Paper>
    </Modal>
  );
}

PublishModal.defaultProps = {
  className: '',
  loading: false,
  open: false
};

PublishModal.propTypes = PublishModalPropTypes;

export default PublishModal;
