import { PublicOutlined } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import { Button, Modal, ModalFooter, ModalHeader } from 'components/base';
import { PagePropTypes } from 'constants/propTypes';
import { ContributionPage } from 'hooks/useContributionPage';
import getDomain from 'utilities/getDomain';
import slugify from 'utilities/slugify';
import { CircularProgress, Explanation, FieldAdornment, ModalContent, Prompt, TextField } from './PublishModal.styled';

const PublishModalPropTypes = {
  className: PropTypes.string,
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onPublish: PropTypes.func.isRequired,
  page: PropTypes.shape(PagePropTypes).isRequired,
  loading: PropTypes.bool,
  slugError: PropTypes.arrayOf(PropTypes.string)
};

export interface PublishModalProps extends InferProps<typeof PublishModalPropTypes> {
  onClose: () => void;
  onPublish: ({ slug }: { slug: string }) => void;
  page: ContributionPage;
  slugError?: string[];
}

export function PublishModal({ open, onClose, onPublish, page, loading, slugError }: PublishModalProps) {
  const [slug, setSlug] = useState(page.slug ?? '');
  const domain = getDomain(window.location.host);

  return (
    <Modal onClose={onClose} open={!!open} aria-labelledby="publish-page-modal-title">
      <ModalHeader icon={<PublicOutlined />} onClose={onClose} id="publish-page-modal-title">
        Publish Page
      </ModalHeader>
      <ModalContent>
        <Prompt>
          Enter a page name to create and publish a unique contribution page link. This page name will serve as the slug
          that appears after your domain's web address.
        </Prompt>
        <Explanation>
          <strong>Example:</strong> If your domain is <strong>mywebsite</strong> and the page name is{' '}
          <strong>give</strong>, the full URL for the contribution page will be:{' '}
          <strong>mywebsite.fundjournalism.org/give</strong>
        </Explanation>
        <TextField
          error={!!slugError}
          fullWidth
          helperText={slugError?.length && slugError.join('. ')}
          id="publish-modal-page-slug"
          InputProps={{
            // Have to copy props from our base component to get styling to look correct.
            classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' },
            startAdornment: (
              <FieldAdornment position="start">
                {page.revenue_program.slug}.{domain}/
              </FieldAdornment>
            )
          }}
          label="Page Name"
          onChange={({ target }) => setSlug(slugify(target.value))}
          placeholder="Ex. contribute, donate, join"
          value={slug}
        ></TextField>
      </ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button color="primaryDark" disabled={!!(!slug || loading)} onClick={() => onPublish({ slug })}>
          {loading ? (
            <span aria-label="Loading">
              <CircularProgress size={20} />
            </span>
          ) : (
            'Publish'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

PublishModal.propTypes = PublishModalPropTypes;

export default PublishModal;
