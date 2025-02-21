import { ReasonFieldsProps } from '../ReasonFields';

export const ReasonFields = (props: ReasonFieldsProps) => (
  <div
    data-error={props.error}
    data-options={JSON.stringify(props.options)}
    data-required={props.required}
    data-selected-option={props.selectedOption}
    data-testid="mock-reason-fields"
    data-text={props.text}
  >
    <button onClick={() => props.onChangeOption('mock-change')}>onChangeOption</button>
    <button onClick={() => props.onChangeText('mock-change')}>onChangeText</button>
  </div>
);
export default ReasonFields;
