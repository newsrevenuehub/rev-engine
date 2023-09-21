import { ChangeEvent, useEffect, useState } from 'react';
import { Checkbox, FormControlLabel } from 'components/base';
import { ElementDetailEditorProps } from 'components/pageEditor/editInterface/ElementEditor.types';
import { SwagElement } from 'hooks/useContributionPage';
import { parseFloatStrictly } from 'utilities/parseFloatStrictly';
import { validateSwagValue } from 'utilities/swagValue';
import SwagOptions from './SwagOptions';
import { EndInputAdornment, Prompt, Root, StartInputAdornment, ThresholdTextField } from './SwagEditor.styled';

export type SwagEditorProps = ElementDetailEditorProps<SwagElement['content']>;

export function SwagEditor({ elementContent, onChangeElementContent, setUpdateDisabled }: SwagEditorProps) {
  const [editableThreshold, setEditableThreshold] = useState((elementContent.swagThreshold ?? '').toString());
  const [thresholdError, setThresholdError] = useState<string>();
  const [editableSwagName, setEditableSwagName] = useState(elementContent.swags[0]?.swagName ?? '');
  const [swagNameError, setSwagNameError] = useState<string>();

  // If the user has entered swag options but not a label, flag that.

  useEffect(() => {
    if (
      elementContent.swags.length > 0 &&
      elementContent.swags[0].swagName.trim() === '' &&
      elementContent.swags[0].swagOptions.length > 0
    ) {
      setSwagNameError('You must enter a selection label.');
    }
  }, [elementContent.swags]);

  // If there are any validation errors, disable the Update button.

  useEffect(() => {
    setUpdateDisabled(!!thresholdError || !!swagNameError);
  }, [setUpdateDisabled, swagNameError, thresholdError]);

  // We need to allow the user to enter anything they like in the swag threshold
  // field, but not be able to save changes if it isn't numeric.

  function handleChangeThreshold(event: ChangeEvent<HTMLInputElement>) {
    setEditableThreshold(event.target.value);

    const value = parseFloatStrictly(event.target.value);

    if (!isNaN(value) && value >= 0) {
      setThresholdError(undefined);
      onChangeElementContent({ ...elementContent, swagThreshold: value });
    } else {
      setThresholdError('Please enter a positive number.');
    }
  }

  // Similarly, we need to allow the user to enter whatever they like in the
  // swag name field in SwagOptions, but block saving changes if it is too long
  // or contains ; or :.

  function handleChangeSwagName(value: string) {
    setEditableSwagName(value);

    const validationError = validateSwagValue(value);

    if (validationError) {
      setSwagNameError(validationError);
    } else {
      setSwagNameError(undefined);
      onChangeElementContent({
        ...elementContent,
        swags: [{ swagName: value, swagOptions: elementContent.swags[0]?.swagOptions ?? [] }]
      });
    }
  }

  function handleAddSwagOption(value: string) {
    onChangeElementContent({
      ...elementContent,
      swags: [
        {
          swagName: elementContent.swags[0]?.swagName ?? '',
          swagOptions: [...(elementContent.swags[0]?.swagOptions ?? []), value]
        }
      ]
    });
  }

  function handleRemoveSwagOption(value: string) {
    onChangeElementContent({
      ...elementContent,
      swags: [
        {
          swagName: elementContent.swags[0]?.swagName ?? '',
          swagOptions: (elementContent.swags[0]?.swagOptions ?? []).filter((existing) => existing !== value)
        }
      ]
    });
  }

  return (
    <Root data-testid="swag-editor">
      <div>
        <Prompt>
          If you offer 'swag' or promotional items to your contributors for giving over a certain amount, you can
          customize the offering here.
        </Prompt>
        <Prompt>
          Enter the minimum contribution per year to qualify and then customize the dropdown with the options available
          for selection. (e.g. If you offer T-shirts, you can fill the dropdown with the T-shirt sizes available.)
        </Prompt>
      </div>
      <ThresholdTextField
        InputProps={{
          // Have to copy props from our base component to get styling to look correct.
          classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' },
          endAdornment: (
            <EndInputAdornment position="end">
              <span>/year</span>
            </EndInputAdornment>
          ),
          startAdornment: (
            <StartInputAdornment position="start">
              <span>$</span>
            </StartInputAdornment>
          )
        }}
        error={!!thresholdError}
        helperText={thresholdError}
        id="swag-editor-swag-threshold"
        label="Amount to Qualify"
        onChange={handleChangeThreshold}
        placeholder="Dollar amount"
        type="number"
        value={editableThreshold}
      />
      <SwagOptions
        onAddSwagOption={handleAddSwagOption}
        onChangeSwagName={handleChangeSwagName}
        onRemoveSwagOption={handleRemoveSwagOption}
        swagName={editableSwagName}
        swagNameError={swagNameError}
        swagOptions={elementContent.swags[0]?.swagOptions ?? []}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={elementContent.optOutDefault}
            onChange={(event) => onChangeElementContent({ ...elementContent, optOutDefault: event.target.checked })}
          />
        }
        label="'Opt-out of swag' checked by default"
      />
    </Root>
  );
}

export default SwagEditor;
