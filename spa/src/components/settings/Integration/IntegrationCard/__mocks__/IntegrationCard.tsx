import { IntegrationCardProps } from '../IntegrationCard';

const IntegrationCard = (props: IntegrationCardProps) => (
  <div data-testid="mock-integration-card">
    <div data-testid="title">{props?.title}</div>
    <div data-testid="toggleLabel">{props?.toggleLabel}</div>
    <div data-testid="toggleTooltipMessage">{props?.toggleTooltipMessage}</div>
    <div data-testid="cornerMessage">{props?.cornerMessage}</div>
    <div data-testid="isActive">{`${props?.isActive}`}</div>
    <button onClick={props.onChange as any} disabled={props?.disabled}>
      connect
    </button>
    <div data-testid="toggleConnectedTooltipMessage">{props?.toggleConnectedTooltipMessage}</div>
    {props?.rightAction && <div data-testid="rightAction">{props?.rightAction}</div>}
  </div>
);

export default IntegrationCard;
