import { PRICING_URL } from 'constants/helperUrls';
import PropTypes, { InferProps } from 'prop-types';
import { Link } from 'components/base';
import { Root, Text, UpgradeIcon } from './ModalUpgradePrompt.styled';

const ModalUpgradePromptPropTypes = {
  text: PropTypes.string.isRequired
};

export type ModalUpgradePromptProps = InferProps<typeof ModalUpgradePromptPropTypes>;

export function ModalUpgradePrompt({ text }: ModalUpgradePromptProps) {
  return (
    <Root>
      <UpgradeIcon />
      <Text>{text}</Text>
      <Link href={PRICING_URL} target="_blank">
        Learn More
      </Link>
    </Root>
  );
}

ModalUpgradePrompt.propTypes = ModalUpgradePromptPropTypes;

export default ModalUpgradePrompt;
