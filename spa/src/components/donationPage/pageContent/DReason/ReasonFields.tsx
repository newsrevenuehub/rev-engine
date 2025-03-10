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
  error: PropTypes.string,
  onChangeText: PropTypes.func.isRequired,
  onChangeOption: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  required: PropTypes.bool,
  selectedOption: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired
};

export interface ReasonFieldsProps extends InferProps<typeof ReasonFieldsPropTypes> {
  onChangeText: (value: string) => void;
  onChangeOption: (value: string) => void;
}

export function ReasonFields({
  error,
  onChangeOption,
  onChangeText,
  options,
  required,
  selectedOption,
  text
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
  const showTextField = useMemo(
    () => optionsWithOther.length === 0 || selectedOption === otherReasonLabel,
    [optionsWithOther.length, selectedOption, otherReasonLabel]
  );

  // We set a hidden input with the correct name because we want these behaviors
  // (in order of precedence):
  //
  // 1. If a preselected reason is chosen, use that value.
  // 2. If the user chose Other from the menu and entered a value, use it.
  // 3. If the user chose Other from the menu but didn't enter a value, use "Other".

  return (
    <Root>
      <input type="hidden" name="reason_for_giving" value={text.trim() === '' ? selectedOption : text} />
      {optionsWithOther.length > 0 && (
        <Select
          data-testid="reason-for-giving-reason-select"
          data-required={!!required /* for unit testing */}
          error={!showTextField && !!error}
          fullWidth
          helperText={!showTextField && error}
          label={t('donationPage.dReason.supportWork')}
          onChange={(e) => onChangeOption(e.target.value)}
          options={optionsWithOther}
          required={!!required}
          value={selectedOption}
        ></Select>
      )}
      <Collapse in={showTextField} unmountOnExit>
        <TextField
          error={!!error}
          fullWidth
          helperText={error}
          id="donation-page-dreason-reason-fields-other"
          label={t('donationPage.dReason.tellUsWhy')}
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
