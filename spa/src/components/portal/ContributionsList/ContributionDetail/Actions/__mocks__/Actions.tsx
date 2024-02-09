import { ActionsProps } from '../Actions';

export const Actions = ({ contribution, onCancelContribution }: ActionsProps) => (
  <div data-testid="mock-actions" data-contribution={contribution.id}>
    <button type="button" onClick={() => onCancelContribution()}>
      Cancel Contribution
    </button>
  </div>
);
export default Actions;
