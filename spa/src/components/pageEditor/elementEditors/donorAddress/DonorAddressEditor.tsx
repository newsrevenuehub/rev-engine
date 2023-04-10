import { Checkbox, FormControlLabel, Radio } from 'components/base';
import { DonorAddressElement, DonorAddressElementAdditionalStateFieldLabel } from 'hooks/useContributionPage';
import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent } from 'react';
import { Checkboxes, Header, Tip, RadioGroup, Text, StyledFormControlLabel } from './DonorAddressEditor.styled';

const DonorAddressEditorPropTypes = {
  elementContent: PropTypes.object.isRequired,
  onChangeElementContent: PropTypes.func.isRequired
};

export interface DonorAddressEditorProps extends InferProps<typeof DonorAddressEditorPropTypes> {
  elementContent: DonorAddressElement['content'];
  onChangeElementContent: (value: DonorAddressElement['content']) => void;
}

export function DonorAddressEditor({ elementContent, onChangeElementContent }: DonorAddressEditorProps) {
  const zipAndCountryOnly = !!elementContent?.zipAndCountryOnly;

  function handleCheckboxChange(
    value: DonorAddressElementAdditionalStateFieldLabel,
    event: ChangeEvent<HTMLInputElement>
  ) {
    if (event.target.checked) {
      onChangeElementContent({
        ...elementContent,
        additionalStateFieldLabels: [...(elementContent.additionalStateFieldLabels ?? []), value]
      });
    } else {
      onChangeElementContent({
        ...elementContent,
        additionalStateFieldLabels: (elementContent.additionalStateFieldLabels ?? []).filter(
          (existing) => existing !== value
        )
      });
    }
  }

  function handleRadioChange(value: DonorAddressElement['content']['addressOptional']) {
    onChangeElementContent({
      ...elementContent,
      addressOptional: value
    });
  }

  function handleZipAndCountryOnly(event: ChangeEvent<HTMLInputElement>) {
    onChangeElementContent({
      ...elementContent,
      zipAndCountryOnly: event.target.checked
    });
  }

  return (
    <div data-testid="donor-address-editor">
      <Text>
        Address data is critical to engage supporters and strengthen reader revenue programs. If you have, or plan to
        have, a major donor program you will need address for wealth-screening.
      </Text>
      <Text>If you’re including a physical Swag option, full address should be required.</Text>
      <StyledFormControlLabel
        control={<Checkbox checked={zipAndCountryOnly} onChange={handleZipAndCountryOnly} />}
        label={
          <>
            <p style={{ margin: 0 }}>
              Include zip/postal code and country <i>only</i>
            </p>
            <p>(exclude all other address fields)</p>
          </>
        }
      />
      <Header>Address should be:</Header>
      <RadioGroup
        aria-label="Address should be"
        onChange={(event) => handleRadioChange(event.target.value === 'optional')}
        value={elementContent.addressOptional ? 'optional' : 'required'}
      >
        <FormControlLabel value="required" control={<Radio />} label="Required" />
        <FormControlLabel value="optional" control={<Radio />} label="Optional" />
      </RadioGroup>
      {!zipAndCountryOnly && (
        <>
          <Header>State Label</Header>
          <Tip>Include additional labels above the address field for State.</Tip>
          <Checkboxes>
            <FormControlLabel
              control={<Checkbox checked disabled />}
              label={
                <>
                  State <span style={{ fontStyle: 'italic' }}>(required)</span>
                </>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!elementContent.additionalStateFieldLabels?.includes('province')}
                  onChange={(event) => handleCheckboxChange('province', event)}
                />
              }
              label="Province"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!elementContent.additionalStateFieldLabels?.includes('region')}
                  onChange={(event) => handleCheckboxChange('region', event)}
                />
              }
              label="Region"
            />
          </Checkboxes>
        </>
      )}
    </div>
  );
}

DonorAddressEditor.propTypes = DonorAddressEditorPropTypes;
export default DonorAddressEditor;
