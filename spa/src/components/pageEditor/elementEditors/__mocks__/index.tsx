import { AmountEditorProps } from '../amount/AmountEditor';

export const AmountEditor = (props: AmountEditorProps) => (
  <div data-testid="mock-amount-editor" data-content={JSON.stringify(props.elementContent)}>
    <button onClick={() => props.onChangeElementContent({ mockChange: true } as any)}>onChangeElementContent</button>
  </div>
);
