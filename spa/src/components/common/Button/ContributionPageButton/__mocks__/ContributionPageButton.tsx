import { ContributionPageButtonProps } from '../ContributionPageButton';

export const ContributionPageButton = (props: ContributionPageButtonProps) => (
  <div data-testid={`mock-contribution-page-button-${props.page.id}`}>
    <button onClick={props.onClick}>{props.page.name}</button>
  </div>
);
