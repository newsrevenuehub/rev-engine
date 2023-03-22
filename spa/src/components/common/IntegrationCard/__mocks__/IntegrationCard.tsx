const IntegrationCard = (props: any) => (
  <div data-testid="mock-integration-card">
    <div data-testid="cornerMessage">{props?.cornerMessage}</div>
    <div data-testid="isActive">{`${props?.isActive}`}</div>
    <button onClick={props.onChange} disabled={props?.disabled}>
      connect
    </button>
  </div>
);

export default IntegrationCard;
