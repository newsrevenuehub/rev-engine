import { FreePlanContentProps } from '../FreePlanContent';

export const FreePlanContent = (props: FreePlanContentProps) => (
  <div data-testid="mock-free-plan-content">
    <button onClick={props.onClose}>FreePlanContent onClose</button>
  </div>
);

export default FreePlanContent;
