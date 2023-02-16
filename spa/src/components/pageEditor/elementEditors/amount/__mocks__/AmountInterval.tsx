import { AmountIntervalProps } from '../AmountInterval';

export const AmountInterval = (props: AmountIntervalProps) => (
  <div
    data-testid={`mock-amount-interval-${props.interval}`}
    data-default-option={props.defaultOption}
    data-options={JSON.stringify(props.options)}
  >
    <button onClick={() => props.onAddAmount(1.23)}>onAddAmount</button>
    <button onClick={() => props.onRemoveAmount(props.options[0])}>onRemoveAmount</button>
    <button onClick={() => props.onSetDefaultAmount(props.options[0])}>onSetDefaultAmount</button>
  </div>
);

export default AmountInterval;
