import { TributeFieldsProps } from '../TributeFields';

export const TributeFields = (props: TributeFieldsProps) => (
  <div
    data-ask-honoree={props.askHonoree}
    data-ask-in-memory-of={props.askInMemoryOf}
    data-error={props.error}
    data-testid="mock-tribute-fields"
    data-tribute-name={props.tributeName}
    data-tribute-type={props.tributeType}
  >
    <button onClick={() => props.onChangeTributeName('mock-change')}>onChangeTributeName</button>
    <button onClick={() => props.onChangeTributeType('honoree')}>onChangeTributeType honoree</button>
    <button onClick={() => props.onChangeTributeType('inMemoryOf')}>onChangeTributeType inMemoryOf</button>
  </div>
);
export default TributeFields;
