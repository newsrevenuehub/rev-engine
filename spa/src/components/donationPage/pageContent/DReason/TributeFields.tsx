import { Collapse } from '@material-ui/core';
import PropTypes, { InferProps } from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormControlLabel as BaseFormControlLabel, RadioGroup } from 'components/base';
import { Checkbox, RadioFormControlLabel, Prompt, Radio, Root, TextField } from './TributeFields.styled';

const TributeFieldsPropTypes = {
  askHonoree: PropTypes.bool,
  askInMemoryOf: PropTypes.bool,
  error: PropTypes.string,
  onChangeTributeName: PropTypes.func.isRequired,
  onChangeTributeType: PropTypes.func.isRequired,
  tributeName: PropTypes.string.isRequired
};

export type TributeType = 'honoree' | 'inMemoryOf' | null;

export interface TributeFieldsProps extends InferProps<typeof TributeFieldsPropTypes> {
  onChangeTributeName: (value: string) => void;
  onChangeTributeType: (value: TributeType) => void;
  tributeType: TributeType;
}

/**
 * Radio buttons shown when there are multiple types of tribute available.
 */
const typeRadios = [
  {
    label: 'common.no',
    value: null
  },
  {
    label: 'donationPage.dReason.tributeSelector.yes.inHonorOf',
    value: 'honoree'
  },
  {
    label: 'donationPage.dReason.tributeSelector.yes.inMemoryOf',
    value: 'inMemoryOf'
  }
];

/**
 * Maps the tributeType prop to the input value the backend expects.
 */
const typeValues = {
  honoree: 'type_honoree',
  inMemoryOf: 'type_in_memory_of'
};

export function TributeFields({
  askHonoree,
  askInMemoryOf,
  error,
  onChangeTributeName,
  onChangeTributeType,
  tributeName,
  tributeType
}: TributeFieldsProps) {
  const { t } = useTranslation();

  // We need to remember the last tribute type selected so that as the text
  // field transitions out, it maintains the last label it had.

  const [fieldLabel, setFieldLabel] = useState<string>();

  useEffect(() => {
    if (!tributeType) {
      return;
    }

    setFieldLabel(
      tributeType === 'inMemoryOf'
        ? t('donationPage.dReason.tributeSelector.inMemoryOf')
        : t('donationPage.dReason.tributeSelector.inHonorOf')
    );
  }, [tributeType, t]);

  // If only one type of tribute is possible, then show a yes/no checkbox. If
  // there are multiple, show a set of radio buttons.
  //
  // We use different styled components here because we need to match appearance
  // with the DFrequency component, which isn't on the base radio button
  // component yet.

  const typeControl =
    askHonoree && askInMemoryOf ? (
      <RadioGroup aria-label={t('donationPage.dReason.tributeSelector.isTribute')} row>
        {typeRadios.map(({ label, value }) => (
          <RadioFormControlLabel
            key={label}
            label={t(label)}
            value={value}
            control={
              <Radio
                checked={tributeType === value}
                data-testid={`tribute-type-${value}`}
                name="tribute_type"
                onChange={() => onChangeTributeType(value as TributeType)}
                value={typeValues[tributeType!] ?? ''}
              />
            }
          />
        ))}
      </RadioGroup>
    ) : (
      <BaseFormControlLabel
        control={
          <Checkbox
            checked={!!tributeType}
            name="tribute_type"
            onChange={(event) =>
              onChangeTributeType(event.target.checked ? (askHonoree ? 'honoree' : 'inMemoryOf') : null)
            }
            value={typeValues[tributeType!] ?? ''}
          />
        }
        label={t(`donationPage.dReason.tributeSelector.yes.${askHonoree ? 'inHonorOf' : 'inMemoryOf'}`)}
      />
    );

  // We should always be called with one of these props set, but if not, show
  // nothing.

  if (!askHonoree && !askInMemoryOf) {
    return null;
  }

  // Names on inputs below must be set exactly in order for the form to be
  // submitted properly.
  //
  // We also need to ensure the text field unmounts when transitioned out so
  // it's not present in the DOM at form submission time, so its value doesn't
  // appear in the form data.

  return (
    <Root>
      <div>
        <Prompt>{t('donationPage.dReason.tributeSelector.isTribute')}</Prompt>
        {typeControl}
      </div>
      <Collapse in={!!tributeType} unmountOnExit>
        <TextField
          data-testid="tribute-input"
          error={!!error}
          fullWidth
          helperText={error}
          label={fieldLabel}
          name={tributeType === 'inMemoryOf' ? 'in_memory_of' : 'honoree'}
          onChange={(event) => onChangeTributeName(event.target.value)}
          required
          value={tributeName}
        />
      </Collapse>
    </Root>
  );
}

TributeFields.propTypes = TributeFieldsPropTypes;
export default TributeFields;
