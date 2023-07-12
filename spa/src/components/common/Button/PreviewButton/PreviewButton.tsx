import PropTypes, { InferProps } from 'prop-types';
import { Corner, Label, Preview, Root } from './PreviewButton.styled';
import { MouseEvent } from 'react';

const PreviewButtonPropTypes = {
  /**
   * ARIA label applied to the button. If omitted, this will use any text
   * content in `preview`--use that instead if possible.
   */
  ariaLabel: PropTypes.string,
  /**
   * Content displayed in the top-left corner of the preview, above preview
   * content.
   */
  corner: PropTypes.node,
  /**
   * Is this button disabled? This has no visual effect.
   */
  disabled: PropTypes.bool,
  /**
   * Label text shown below the preview.
   */
  label: PropTypes.node.isRequired,
  /**
   * Called when the button is clicked.
   */
  onClick: PropTypes.func,
  /**
   * Preview content. All top-level nodes will be styled to fill the entire
   * available preview space for you.
   */
  preview: PropTypes.node,
  /**
   * Height of the preview content in pixels. Defaults to 120.
   */
  previewHeight: PropTypes.number
};

export interface PreviewButtonProps extends InferProps<typeof PreviewButtonPropTypes> {
  onClick?: (event: MouseEvent) => void;
}

export function PreviewButton({
  ariaLabel,
  corner,
  disabled,
  label,
  onClick,
  preview,
  previewHeight
}: PreviewButtonProps) {
  return (
    <Root style={{ gridTemplateRows: `${previewHeight ?? 120}px 1fr` }}>
      <Corner>{corner}</Corner>
      <Preview aria-label={ariaLabel ?? undefined} disabled={!!disabled} onClick={onClick}>
        {preview}
      </Preview>
      <Label $disabled={disabled}>{label}</Label>
    </Root>
  );
}

PreviewButton.propTypes = PreviewButtonPropTypes;
export default PreviewButton;
