import { BookmarkBorder } from '@material-ui/icons';
import { CSSProperties } from 'react';
import { Style } from 'hooks/useStyleList';
import { PreviewButton, PreviewButtonProps } from '../PreviewButton';
import { EditIcon, HoverOverlay, LiveBadge, Preview } from './StyleButton.styled';

/**
 * Colors we use from the style to generate the preview, in order left to right.
 */
const previewColors = ['cstm_mainBackground', 'cstm_formPanelBackground', 'cstm_mainHeader', 'cstm_CTAs'];
const previewColorStopWidth = 100 / previewColors.length;

export interface StyleButtonProps extends Omit<PreviewButtonProps, 'corner' | 'disabled' | 'label' | 'preview'> {
  style: Style;
}

export function StyleButton({ style, ...other }: StyleButtonProps) {
  const previewStyle: CSSProperties = {
    backgroundImage: `linear-gradient(to right, ${previewColors
      .map((colorName, index) => {
        const color = style.colors?.[colorName] ?? 'transparent';

        // Repeat the color on two stops to create a hard edge in the gradient.

        return `${color} ${index * previewColorStopWidth}%,${color} ${(index + 1) * previewColorStopWidth}%`;
      })
      .join(',')})`
  };

  return (
    <PreviewButton
      ariaLabel={style.name}
      corner={
        style.used_live && (
          <LiveBadge>
            <BookmarkBorder aria-label="Live" />
          </LiveBadge>
        )
      }
      label={style.name}
      preview={
        <>
          <HoverOverlay icon={<EditIcon />} />
          <Preview style={previewStyle} />
        </>
      }
      previewHeight={70}
      {...other}
    />
  );
}

export default StyleButton;
