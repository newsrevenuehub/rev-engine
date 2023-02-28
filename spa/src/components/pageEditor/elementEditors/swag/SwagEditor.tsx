import { Checkbox, EditableList, Fieldset } from 'components/base';
import { ElementDetailEditorProps } from 'components/pageEditor/editInterface/ElementEditor.types';
import { SwagElement } from 'hooks/useContributionPage';
import { ChangeEvent, useEffect, useState } from 'react';
import validateInputPositiveFloat from 'utilities/validateInputPositiveFloat';
import {
  Checkboxes,
  CheckboxFieldLabel,
  Error,
  Root,
  SwagNameField,
  ThresholdField,
  ThresholdFieldAdornment
} from './SwagEditor.styled';

/**
 * The DSwag component that displays the element on an actual page expects
 * some structures to be present in element content.
 */
const defaultContent = {
  swags: []
};

export type SwagEditorProps = ElementDetailEditorProps<SwagElement['content']>;

export function SwagEditor({
  elementContent,
  onChangeElementContent,
  pagePreview,
  setUpdateDisabled
}: SwagEditorProps) {
  const [editedThreshold, setEditedThreshold] = useState(elementContent.swagThreshold?.toString() ?? '');
  const [editedThresholdError, setEditedThresholdError] = useState<string>();

  // We only allow editing the first swag group. However, it may not be defined
  // yet so this sets some defaults.

  const swagGroup = elementContent.swags?.[0] ?? { swagName: '', swagOptions: [] };
  const updateDisabled =
    !elementContent.swagThreshold ||
    !validateInputPositiveFloat(elementContent.swagThreshold.toString()) ||
    !swagGroup.swagName ||
    swagGroup.swagName.trim() === '' ||
    swagGroup.swagOptions.length === 0;

  useEffect(() => setUpdateDisabled(updateDisabled), [updateDisabled, setUpdateDisabled]);

  function handleSwagNameChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.value.trim() !== '') {
      onChangeElementContent({
        ...defaultContent,
        ...elementContent,
        swags: [{ ...swagGroup, swagName: event.target.value }]
      });
    }
  }

  function handleSwagOptionChange(swagOptions: string[]) {
    onChangeElementContent({ ...defaultContent, ...elementContent, swags: [{ ...swagGroup, swagOptions }] });
  }

  function handleThresholdEdit(event: ChangeEvent<HTMLInputElement>) {
    setEditedThreshold(event.target.value);

    if (validateInputPositiveFloat(event.target.value, 2)) {
      setEditedThresholdError(undefined);
      onChangeElementContent({ ...defaultContent, ...elementContent, swagThreshold: parseFloat(event.target.value) });
    } else {
      setEditedThresholdError('Please enter a positive number with at most two decimal places.');
    }
  }

  function validateSwagOption(value: string) {
    if (value.length > 40) {
      return 'An option can be 40 characters long at most.';
    }

    if (swagGroup.swagOptions.includes(value)) {
      return 'This option has already been added.';
    }
  }

  return (
    <Root data-testid="swag-editor">
      <div>
        <p>
          If you offer 'swag' or promotional items to your contributors for giving over a certain amount, you can
          customize the offering here.
        </p>
        <p>
          Enter the minimum contribution per year to qualify and then customize the dropdown with the options available
          for selection (e.g. If you offer T-shirts, you can fill the dropdown with the T-shirt sizes available.)
        </p>
      </div>
      <ThresholdField
        error={!!editedThresholdError}
        helperText={editedThresholdError}
        id="swag-editor-threshold"
        InputProps={{
          // Needed to apply styling present on the base component.
          classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' },
          endAdornment: <ThresholdFieldAdornment>/year</ThresholdFieldAdornment>,
          placeholder: 'Dollars',
          startAdornment: <ThresholdFieldAdornment>$</ThresholdFieldAdornment>
        }}
        label="Amount to Qualify"
        type="number"
        onChange={handleThresholdEdit}
        value={editedThreshold}
      />
      <Fieldset label="Dropdown Menu">
        <SwagNameField
          error={!swagGroup.swagName || swagGroup.swagName.trim() === ''}
          fullWidth
          helperText={(!swagGroup.swagName || swagGroup.swagName.trim() === '') && 'You must enter a name.'}
          id="swag-editor-swag-group-name"
          label="Item Option"
          onChange={handleSwagNameChange}
          placeholder="e.g. t-shirt, hat, and/or mug"
          value={swagGroup.swagName}
        />
        <EditableList
          id="swag-editor-swag-options"
          onChange={handleSwagOptionChange}
          prompt="Add new option"
          validateNewValue={validateSwagOption}
          value={swagGroup.swagOptions}
        />
        {swagGroup.swagOptions.length === 0 && <Error>You must add at least one option.</Error>}
      </Fieldset>
      <Checkboxes>
        <CheckboxFieldLabel
          control={
            <Checkbox
              checked={elementContent.optOutDefault ?? false}
              onChange={(event) =>
                onChangeElementContent({ ...defaultContent, ...elementContent, optOutDefault: event.target.checked })
              }
            />
          }
          label="'Opt-out of swag' checked by default"
        />
        {pagePreview.allow_offer_nyt_comp && (
          <CheckboxFieldLabel
            control={
              <Checkbox
                checked={elementContent.offerNytComp ?? false}
                onChange={(event) =>
                  onChangeElementContent({ ...defaultContent, ...elementContent, offerNytComp: event.target.checked })
                }
              />
            }
            label="Offer contributors a complimentary NYT subscription"
          />
        )}
      </Checkboxes>
    </Root>
  );
}

export default SwagEditor;
