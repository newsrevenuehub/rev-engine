import { PreviewButton, PreviewButtonProps } from '../PreviewButton';
import { AddIcon, Preview } from './NewButton.styled';

export type NewButtonProps = Omit<PreviewButtonProps, 'corner' | 'preview'>;

export function NewButton(props: NewButtonProps) {
  const { label, ...other } = props;

  return <PreviewButton label={label} preview={<Preview $disabled={other.disabled} icon={<AddIcon />} />} {...other} />;
}

export default NewButton;
