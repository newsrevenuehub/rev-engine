export interface InputProps {
  label: string;
  value: string;
  type: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors?: string[];
}

declare const Input: (props: InputProps) => JSX.Element;

export default Input;
