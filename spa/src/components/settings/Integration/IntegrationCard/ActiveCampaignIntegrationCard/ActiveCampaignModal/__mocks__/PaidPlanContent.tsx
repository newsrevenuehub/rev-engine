import { PaidPlanContentProps } from '../PaidPlanContent';

export const PaidPlanContent = (props: PaidPlanContentProps) => (
  <div data-testid="mock-paid-plan-content" data-connected={props.connected}>
    <button onClick={props.onClose}>PaidPlanContent onClose</button>
    <button onClick={props.onStartConnection}>PaidPlanContent onStartConnection</button>
  </div>
);

export default PaidPlanContent;
