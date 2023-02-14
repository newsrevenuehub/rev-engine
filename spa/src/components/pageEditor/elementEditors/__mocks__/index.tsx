import { AmountEditorProps } from '../amount/AmountEditor';
import { ReasonEditorProps } from '../reason/ReasonEditor';

export const AmountEditor = (props: AmountEditorProps) => (
  <div data-testid="mock-amount-editor" data-content={JSON.stringify(props.elementContent)}>
    <button onClick={() => props.onChangeElementContent({ mockChange: true } as any)}>onChangeElementContent</button>
    <button onClick={() => props.onChangeElementRequiredFields(['mockChange'])}>onChangeElementRequiredFields</button>
  </div>
);

export const ReasonEditor = (props: ReasonEditorProps) => (
  <div data-testid="mock-reason-editor" data-content={JSON.stringify(props.elementContent)} />
);
