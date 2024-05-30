import PropTypes, { InferProps } from 'prop-types';
import CheckIcon from '@material-ui/icons/Check';
import { useAlert } from 'react-alert';

import { Wrapper, Input, CopyButton } from './CopyInputButton.styled';

type CopyInputButtonProps = InferProps<typeof CopyInputButtonPropTypes>;

/** The `dataTestId` prop gets attached to the child `CopyButton` component, not the Input. */
const CopyInputButton = ({ title, link, copied, setCopied, 'data-testid': dataTestId }: CopyInputButtonProps) => {
  const alert = useAlert();
  const showCopied = copied === link;
  return (
    <Wrapper>
      <Input
        label={title}
        value={link}
        id={title.replace(/ /g, '')}
        InputLabelProps={{
          classes: {
            asterisk: 'NreTextFieldInputLabelAsterisk',
            formControl: 'NreCopyInputLabelFormControl',
            root: 'NreTextFieldInputLabelRoot'
          },
          shrink: true
        }}
        InputProps={{
          classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' },
          readOnly: true
        }}
      />
      <CopyButton
        data-testid={dataTestId}
        onClick={() => {
          navigator.clipboard.writeText(link).then(
            // If copy succeeds: show "copied" button
            () => setCopied(link),
            // If copy fails: show alert with reason and alternate solution
            (error) =>
              alert.error(`Failed to copy link automatically. Please try selecting the text directly from the input.
                Error reason: ${error}`)
          );
        }}
        aria-label={`${showCopied ? 'Copied' : 'Copy'} ${title}`}
        $copied={showCopied}
      >
        {showCopied ? (
          <>
            Copied <CheckIcon style={{ width: 18, height: 18, marginLeft: 4 }} />
          </>
        ) : (
          'Copy'
        )}
      </CopyButton>
    </Wrapper>
  );
};

const CopyInputButtonPropTypes = {
  title: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  copied: PropTypes.string.isRequired,
  setCopied: PropTypes.func.isRequired,
  'data-testid': PropTypes.string
};

CopyInputButton.propTypes = CopyInputButtonPropTypes;

export default CopyInputButton;
