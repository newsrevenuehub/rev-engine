import styled from 'styled-components';

// We can't just use the `hidden` attribute on this input or `display: none`
// because browser autofill will ignore it. Instead, we take it out of the
// layout flow, make it invisible, and make it ignore pointer events.
//
// We also need to set `aria-hidden` and `tabIndex` on the element to make it
// ignored by AX and take it out of tab order.

export const AutofillProxy = styled.label`
  opacity: 0;
  pointer-events: none;
  position: absolute;
`;
