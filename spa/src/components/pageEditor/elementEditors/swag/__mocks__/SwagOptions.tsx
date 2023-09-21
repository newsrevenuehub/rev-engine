import { SwagOptionsProps } from '../SwagOptions';

export function SwagOptions(props: SwagOptionsProps) {
  return (
    <div
      data-testid="mock-swag-options"
      data-swag-name={props.swagName}
      data-swag-name-error={props.swagNameError}
      data-swag-options={JSON.stringify(props.swagOptions)}
    >
      <button onClick={() => props.onChangeSwagName('valid')}>onChangeSwagName valid</button>
      <button onClick={() => props.onChangeSwagName('invalid;')}>onChangeSwagName invalid</button>
      <button onClick={() => props.onAddSwagOption('mock-swag-option')}>onAddSwagOption</button>
      <button onClick={() => props.onRemoveSwagOption('mock-swag-option')}>onRemoveSwagOption</button>
    </div>
  );
}

export default SwagOptions;
