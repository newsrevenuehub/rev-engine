import { useLayoutEffect } from 'react';

type OptionalHTMLElement = HTMLElement | null;

/**
 * This handles aligning the detail view vertically beside the item it is
 * describing. We need to:
 *
 * - Handle mobile viewports, when the anchor will have `display: none`.
 * - Handle resizing between mobile and larger viewports.
 * - Keep the detail inside its parent container, both top and bottom.
 * - To the extent possible, vertically align detail's top with the item's top.
 * - Maintain the detail in layout (i.e. not position it absolutely) so that it
 *   affects the total page height.
 *
 * In practice, the vertical position of the anchor never varies once the page
 * is rendered, so we don't need to listen for viewport resizes.
 */
export function useDetailAnchor(itemEl: OptionalHTMLElement, detailEl: OptionalHTMLElement) {
  useLayoutEffect(() => {
    if (itemEl && detailEl && detailEl.parentElement) {
      // Set a CSS variable on the element so that the positioning can be
      // applied conditionally by breakpoint. See ContributionDetail.styled.ts.
      //
      // Math.max(-itemRect.top, ...) keeps the element from moving vertically
      // above its container.
      //
      // Math.min(..., ...) keeps the element from extending past the bottom of
      // its container.

      detailEl.style.setProperty(
        '--two-column-vertical-offset',
        `${Math.max(
          -itemEl.offsetTop,
          Math.min(itemEl.offsetTop - detailEl.offsetTop, detailEl.parentElement.offsetHeight - detailEl.offsetHeight)
        )}px`
      );
      detailEl.style.visibility = 'visible';
    } else if (detailEl) {
      // We don't have enough DOM information to position the element correctly.
      // Hide it from view in the meantime. Visibility is used here so we can
      // get its height later.

      detailEl.style.visibility = 'hidden';
    }
  }, [itemEl, detailEl]);
}
