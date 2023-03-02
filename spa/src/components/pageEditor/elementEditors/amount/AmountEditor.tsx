import { ChangeEvent } from 'react';
import { Checkbox } from 'components/base';
import { ContributionInterval } from 'constants/contributionIntervals';
import { AmountElement } from 'hooks/useContributionPage';
import { AllowOtherFormControlLabel, Intervals, Tip } from './AmountEditor.styled';
import AmountInterval from './AmountInterval';
import { ElementDetailEditorProps } from 'components/pageEditor/editInterface/ElementEditor.types';

export type AmountEditorProps = ElementDetailEditorProps<AmountElement['content']>;

export function AmountEditor({ contributionIntervals, elementContent, onChangeElementContent }: AmountEditorProps) {
  function handleAddAmount(interval: ContributionInterval, value: number) {
    // Keep the list of amounts sorted numerically.

    const newInterval = [...(elementContent.options[interval] ?? []), value].sort((a, b) => a - b);

    onChangeElementContent({
      ...elementContent,
      options: {
        ...elementContent.options,
        [interval]: newInterval
      }
    });
  }

  function handleRemoveAmount(interval: ContributionInterval, value: number) {
    onChangeElementContent({
      ...elementContent,
      options: {
        ...elementContent.options,
        [interval]: (elementContent.options[interval] ?? []).filter((existing) => existing !== value)
      }
    });
  }

  function handleSetDefaultAmount(interval: ContributionInterval, value: number) {
    onChangeElementContent({ ...elementContent, defaults: { ...elementContent.defaults, [interval]: value } });
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChangeElementContent({ ...elementContent, allowOther: event.target.checked });
  }

  // Legacy data may give us amounts set as strings. We convert here so that
  // child components don't have to deal with this complexity.

  return (
    <div data-testid="amount-editor">
      <p>Highlighted amounts will be selected by default on live donation pages. Click an amount to highlight.</p>
      <Tip>Tip: We've pre-selected the most common contribution amounts.</Tip>
      <Intervals>
        {contributionIntervals.map(({ interval }) => (
          <AmountInterval
            defaultOption={
              elementContent.defaults && elementContent.defaults[interval]
                ? parseFloat(elementContent.defaults[interval] as unknown as string)
                : undefined
            }
            key={interval}
            interval={interval}
            options={elementContent.options[interval]?.map((value) => parseFloat(value as unknown as string)) ?? []}
            onAddAmount={(value) => handleAddAmount(interval, value)}
            onRemoveAmount={(value) => handleRemoveAmount(interval, value)}
            onSetDefaultAmount={(value) => handleSetDefaultAmount(interval, value)}
          />
        ))}
      </Intervals>
      <AllowOtherFormControlLabel
        control={<Checkbox checked={elementContent.allowOther} onChange={handleChange} />}
        label='Include "other" as an option for all frequencies'
      />
    </div>
  );
}

export default AmountEditor;
