import { ChangeEvent, useEffect } from 'react';
import { Checkbox, Switch } from 'components/base';
import { ElementDetailEditorProps } from 'components/pageEditor/editInterface/ElementEditor.types';
import { DonorInfoElement } from 'hooks/useContributionPage';
import { AlignedFormControlLabel } from './ContributorInfoEditor.styled';

export type ContributorInfoEditorProps = ElementDetailEditorProps<DonorInfoElement['content']>;

export function ContributorInfoEditor({
  elementContent,
  elementRequiredFields,
  onChangeElementContent,
  onChangeElementRequiredFields
}: ContributorInfoEditorProps) {
  useEffect(() => {
    // If askPhone ever is false, make sure it's not a required field.

    if (!elementContent.askPhone && elementRequiredFields.includes('phone')) {
      onChangeElementRequiredFields(elementRequiredFields.filter((value) => value !== 'phone'));
    }
  }, [elementContent.askPhone, elementRequiredFields, onChangeElementRequiredFields]);

  function handleRequirePhoneChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.checked) {
      onChangeElementRequiredFields([...elementRequiredFields, 'phone']);
    } else {
      onChangeElementRequiredFields(elementRequiredFields.filter((value) => value !== 'phone'));
    }
  }

  return (
    <div data-testid="contributor-info-editor">
      <AlignedFormControlLabel
        control={
          <Switch
            checked={elementContent.askPhone}
            onChange={(event) => onChangeElementContent({ ...elementContent, askPhone: event.target.checked })}
          />
        }
        label="Ask for phone number?"
      />
      <AlignedFormControlLabel
        control={<Checkbox checked={elementRequiredFields.includes('phone')} onChange={handleRequirePhoneChange} />}
        disabled={!elementContent.askPhone}
        label="Required to complete contribution"
        $smallLabel
      />
    </div>
  );
}

export default ContributorInfoEditor;
