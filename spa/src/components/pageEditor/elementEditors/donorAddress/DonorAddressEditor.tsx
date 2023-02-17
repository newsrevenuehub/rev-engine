import { FormControlLabel } from '@material-ui/core';
import { Checkbox } from 'components/base';
import { DonorAddressElement, DonorAddressElementAdditionalStateFieldLabel } from 'hooks/useContributionPage';
import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent } from 'react';
import { Checkboxes, Header, Tip } from './DonorAddressEditor.styles';

const DonorAddressEditorPropTypes = {
  elementContent: PropTypes.object.isRequired,
  onChangeElementContent: PropTypes.func.isRequired
};

export interface DonorAddressEditorProps extends InferProps<typeof DonorAddressEditorPropTypes> {
  elementContent: DonorAddressElement['content'];
  onChangeElementContent: (value: DonorAddressElement['content']) => void;
}

export function DonorAddressEditor({ elementContent, onChangeElementContent }: DonorAddressEditorProps) {
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

  return (
    <div data-testid="donor-address-editor">
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
        ></FormControlLabel>
        <FormControlLabel
          control={
            <Checkbox
              checked={elementContent.additionalStateFieldLabels?.includes('province')}
              onChange={(event) => handleCheckboxChange('province', event)}
            />
          }
          label="Province"
        ></FormControlLabel>
        <FormControlLabel
          control={
            <Checkbox
              checked={elementContent.additionalStateFieldLabels?.includes('region')}
              onChange={(event) => handleCheckboxChange('region', event)}
            />
          }
          label="Region"
        ></FormControlLabel>
      </Checkboxes>
    </div>
  );
}

DonorAddressEditor.propTypes = DonorAddressEditorPropTypes;
export default DonorAddressEditor;
