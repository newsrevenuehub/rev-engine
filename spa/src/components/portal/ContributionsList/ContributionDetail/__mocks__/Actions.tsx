import { ActionsProps } from '../Actions';

export const Actions = ({ contribution, cancelContribution }: ActionsProps) => (
  <div data-testid="mock-actions" data-contribution={contribution.id}>
    <button type="button" onClick={() => cancelContribution(contribution.id)}>
      Cancel Contribution
    </button>
  </div>
);
export default Actions;
