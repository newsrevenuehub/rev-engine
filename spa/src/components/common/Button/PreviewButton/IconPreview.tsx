import PropTypes, { InferProps } from 'prop-types';
import { Root } from './IconPreview.styled';

const IconPreviewPropTypes = {
  className: PropTypes.string,
  /**
   * Icon content.
   */
  icon: PropTypes.node.isRequired
};

export type IconPreviewProps = InferProps<typeof IconPreviewPropTypes>;

/**
 * A helper component which displays a centered icon with background color. It
 * can be used as preview content in PreviewButton.
 */
export function IconPreview({ className, icon }: IconPreviewProps) {
  return <Root className={className!}>{icon}</Root>;
}

IconPreview.propTypes = IconPreviewPropTypes;
export default IconPreview;
