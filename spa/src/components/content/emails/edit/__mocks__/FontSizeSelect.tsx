import { FontSizeSelectProps } from '../FontSizeSelect';

export const FontSizeSelect = ({ editor }: FontSizeSelectProps) => (
  <div data-testid="mock-font-size-select" data-editor={JSON.stringify(editor)} />
);

export default FontSizeSelect;
