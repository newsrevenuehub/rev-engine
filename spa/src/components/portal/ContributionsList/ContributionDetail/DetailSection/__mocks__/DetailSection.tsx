import { DetailSectionProps } from '../DetailSection';

export const DetailSection = ({ children, controls, disabled, highlighted, title }: DetailSectionProps) => (
  <div data-testid="mock-detail-section" data-disabled={disabled} data-highlighted={highlighted}>
    {title}
    {controls}
    {children}
  </div>
);

export default DetailSection;
