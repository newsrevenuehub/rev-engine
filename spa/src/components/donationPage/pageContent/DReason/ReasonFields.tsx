import { Collapse } from '@material-ui/core';
import PropTypes, { InferProps } from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { Root, Select, TextField } from './ReasonFields.styled';

// We need to track both a selected reason and a user-entered reason so that if
// the user types in a reason that exactly matches a pre-selected one, the text
// field doesn't disappear. In other words, if we used a single value, then we
// wouldn't be able to distinguish between a user who chose a pre-selected value
// and one who typed one in that matched a pre-selected value, because we
// conditionally show the text field in this component depending on the state of
// the select.

const ReasonFieldsPropTypes = {
  onChangeText: PropTypes.func.isRequired,
  onChangeOption: PropTypes.func.isRequired,
  optionError: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  required: PropTypes.bool,
  selectedOption: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  textError: PropTypes.string
};

export interface ReasonFieldsProps extends InferProps<typeof ReasonFieldsPropTypes> {
  onChangeText: (value: string) => void;
  onChangeOption: (value: string) => void;
}

export function ReasonFields({
  onChangeOption,
  onChangeText,
  optionError,
  options,
  required,
  selectedOption,
  text,
  textError
}: ReasonFieldsProps) {
  const { t } = useTranslation();
  const otherReasonLabel = t('donationPage.dReason.other');
  const optionsWithOther = useMemo(() => {
    if (options.length > 0) {
      return [
        ...options.map((option) => ({ label: option, value: option })),
        { label: otherReasonLabel, value: otherReasonLabel }
      ];
    }

    return [];
  }, [options, otherReasonLabel]);

  // Names on inputs below must be set exactly in order for the form to be
  // submitted properly.
  //
  // We also need to ensure the text field unmounts when transitioned out so
  // it's not present in the DOM at form submission time, so its value doesn't
  // appear in the form data.

  return (
    <Root>
      {optionsWithOther.length > 0 && (
        <Select
          data-testid="reason-for-giving-reason-select"
          error={!!optionError}
          fullWidth
          helperText={optionError}
          label={t('donationPage.dReason.supportWork')}
          name="reason_for_giving"
          onChange={(e) => onChangeOption(e.target.value)}
          options={optionsWithOther}
          required={!!required}
          value={selectedOption}
        ></Select>
      )}
      <Collapse in={optionsWithOther.length === 0 || selectedOption === otherReasonLabel} unmountOnExit>
        <TextField
          error={!!textError}
          fullWidth
          helperText={textError}
          label={t('donationPage.dReason.tellUsWhy')}
          name="reason_other"
          onChange={(event) => onChangeText(event.target.value)}
          required={!!required}
          value={text}
        />
      </Collapse>
    </Root>
  );
}

ReasonFields.propTypes = ReasonFieldsPropTypes;
export default ReasonFields;
