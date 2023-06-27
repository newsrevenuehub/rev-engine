import { PreviewButton, PreviewButtonProps } from '../PreviewButton';
import { ContributionPage } from 'hooks/useContributionPage';
import {
  EditIcon,
  HoverOverlay,
  Label,
  PreviewImage,
  PreviewPlaceholder,
  PublishedBadge
} from './ContributionPageButton.styled';
import { pageIsPublished } from 'utilities/editPageGetSuccessMessage';
import DefaultPageButton from './DefaultPageButton';

export interface ContributionPageButtonProps
  extends Omit<PreviewButtonProps, 'corner' | 'disabled' | 'label' | 'preview'> {
  page: ContributionPage;
}

export function ContributionPageButton({ page, ...other }: ContributionPageButtonProps) {
  const label =
    page.id === page.revenue_program.default_donation_page ? (
      <Label>
        <DefaultPageButton domId={page.name.replace(/\s/g, '-') + '-default-page'} /> {page.name}
      </Label>
    ) : (
      page.name
    );

  const preview = page.page_screenshot ? (
    <PreviewImage
      data-testid="preview-image"
      style={{ backgroundImage: `url(${page.page_screenshot})` }}
    ></PreviewImage>
  ) : (
    <PreviewPlaceholder>No preview</PreviewPlaceholder>
  );

  return (
    <PreviewButton
      ariaLabel={page.name}
      corner={pageIsPublished(page) && <PublishedBadge>LIVE</PublishedBadge>}
      label={label}
      preview={
        <>
          <HoverOverlay icon={<EditIcon />} />
          {preview}
        </>
      }
      {...other}
    />
  );
}

export default ContributionPageButton;
