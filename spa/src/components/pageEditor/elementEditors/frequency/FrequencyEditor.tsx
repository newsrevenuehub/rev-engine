import { ChangeEvent, useEffect } from 'react';
import { OffscreenText, Radio, RadioGroup, Switch } from 'components/base';
import { ElementDetailEditorProps } from 'components/pageEditor/editInterface/ElementEditor.types';
import { ContributionInterval, CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';
import { FrequencyElement } from 'hooks/useContributionPage';
import {
  ToggleFormControlLabel,
  EnabledControls,
  Error,
  Fieldset as DefaultFieldset,
  Legend as DefaultLegend,
  Controls,
  RadioFormControlLabel
} from './FrequencyEditor.styles';

// Values that are added to element content when the user enables a contribution
// interval.

const intervalInserts: Record<ContributionInterval, { value: ContributionInterval }> = {
  one_time: { value: CONTRIBUTION_INTERVALS.ONE_TIME },
  month: { value: CONTRIBUTION_INTERVALS.MONTHLY },
  year: { value: CONTRIBUTION_INTERVALS.ANNUAL }
};

// These configure how many frequencies are required, and the validation error
// users see if they disable too many.

const minFrequencies = 1;
const frequencyError =
  minFrequencies !== 1
    ? `You must have at least ${minFrequencies} frequencies enabled.`
    : 'You must have at least 1 frequency enabled.';

export type FrequencyEditorProps = ElementDetailEditorProps<FrequencyElement['content']>;

export function FrequencyEditor({ elementContent, onChangeElementContent, setUpdateDisabled }: FrequencyEditorProps) {
  const updateDisabled = elementContent.length < minFrequencies;
  const enabled = elementContent.map(({ value }) => value);
  const defaultValue = elementContent.reduce<ContributionInterval | null>(
    (result, { isDefault, value }) => (isDefault ? value : result),
    null
  );

  useEffect(() => setUpdateDisabled(updateDisabled), [updateDisabled, setUpdateDisabled]);

  useEffect(() => {
    // If there is no default set (e.g. if the user just disabled the default
    // frequency), set it to the first frequency. The check on length is to
    // prevent a meaningless update that will cause an infinite render as the
    // effect keeps triggering, but elementContent stays the same.

    if (defaultValue === null && elementContent.length > 0) {
      onChangeElementContent(
        elementContent.map((content, index) => (index === 0 ? { ...content, isDefault: true } : content))
      );
    }
  }, [defaultValue, elementContent, onChangeElementContent]);

  function handleDefaultChange(value: ContributionInterval) {
    onChangeElementContent(elementContent.map((content) => ({ ...content, isDefault: value === content.value })));
  }

  function handleEnabledChange(toggleValue: ContributionInterval, event: ChangeEvent<HTMLInputElement>) {
    if (event.target.checked) {
      onChangeElementContent([...elementContent, intervalInserts[toggleValue]]);
    } else {
      onChangeElementContent(elementContent.filter(({ value }) => value !== toggleValue));
    }
  }

  return (
    <div data-testid="frequency-editor">
      <Controls>
        <EnabledControls>
          <ToggleFormControlLabel
            control={
              <Switch
                checked={enabled.includes('one_time')}
                onChange={(event) => handleEnabledChange('one_time', event)}
              />
            }
            label="One-time payments enabled"
          />
          <ToggleFormControlLabel
            control={
              <Switch checked={enabled.includes('month')} onChange={(event) => handleEnabledChange('month', event)} />
            }
            label="Monthly payments enabled"
          />
          <ToggleFormControlLabel
            control={
              <Switch checked={enabled.includes('year')} onChange={(event) => handleEnabledChange('year', event)} />
            }
            label="Yearly payments enabled"
          />
        </EnabledControls>
        <DefaultFieldset>
          <DefaultLegend>Selected by Default</DefaultLegend>
          <RadioGroup
            aria-label="Selected by Default"
            onChange={(event) => handleDefaultChange(event.target.value as ContributionInterval)}
            value={defaultValue}
          >
            <RadioFormControlLabel
              value="one_time"
              control={<Radio disabled={!enabled.includes('one_time')} />}
              label={<OffscreenText>One-time</OffscreenText>}
            />
            <RadioFormControlLabel
              value="month"
              control={<Radio disabled={!enabled.includes('month')} />}
              label={<OffscreenText>Monthly</OffscreenText>}
            />
            <RadioFormControlLabel
              value="year"
              control={<Radio disabled={!enabled.includes('year')} />}
              label={<OffscreenText>Yearly</OffscreenText>}
            />
          </RadioGroup>
        </DefaultFieldset>
      </Controls>
      {updateDisabled && <Error>{frequencyError}</Error>}
    </div>
  );
}

export default FrequencyEditor;
