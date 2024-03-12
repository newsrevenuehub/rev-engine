import { ContributionsHeaderProps } from '../ContributionsHeader';

export const ContributionsHeader = ({ defaultPage, revenueProgram }: ContributionsHeaderProps) => (
  <div data-testid="mock-contributions-header" data-default-page={defaultPage?.id} data-rp={revenueProgram?.id} />
);
