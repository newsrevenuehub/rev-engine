import PropTypes, { InferProps } from 'prop-types';
import DOMPurify from 'dompurify';
import styled from 'styled-components';
import { useMemo } from 'react';

const RichTextDisplayPropTypes = {
  /**
   * HTML to display.
   */
  html: PropTypes.string.isRequired
};

export type RichTextDisplayProps = InferProps<typeof RichTextDisplayPropTypes>;

// We have to enter the size and align selectors manually here--Styled
// Components doesn't allow for programmtically creating them. The class names
// come from utils/draftJs.ts. These also should have no link to our theme so
// that theme changes can't impact user content.

const Root = styled.div`
  & {
    p,
    ul,
    li {
      line-height: 1.6;
    }

    blockquote {
      padding: 0.5rem 0 0.5rem 1rem;
      border-left: 6px solid ${(props) => props.theme.colors.grey[0]};
      line-height: 1.6;
      font-weight: 200;
    }

    .nre-draftjs-font-size-13 {
      font-size: 13px;
    }

    .nre-draftjs-font-size-14 {
      font-size: 14px;
    }

    .nre-draftjs-font-size-15 {
      font-size: 15px;
    }

    .nre-draftjs-font-size-16 {
      font-size: 16px;
    }

    .nre-draftjs-font-size-24 {
      font-size: 24px;
    }

    .nre-draftjs-text-align-center {
      text-align: center;
    }

    .nre-draftjs-text-align-left {
      text-align: left;
    }

    .nre-draftjs-text-align-right {
      text-align: right;
    }
  }
`;

/**
 * Displays content created in <RichTextEditor>, applying styles so that
 * user-set font size and text alignment displays properly. Don't give this
 * component arbitrary HTML.
 */
export function RichTextDisplay({ html }: RichTextDisplayProps) {
  const cleanedHtml = useMemo(() => DOMPurify.sanitize(html), [html]);

  return <Root dangerouslySetInnerHTML={{ __html: cleanedHtml }} />;
}

RichTextDisplay.propTypes = RichTextDisplayPropTypes;
export default RichTextDisplay;
