import { Fragment, useEffect } from 'react';
import { Checkbox } from 'components/base';
import { ContributionInterval } from 'constants/contributionIntervals';
import { AmountElement } from 'hooks/useContributionPage';
import { AllowOtherFormControlLabel, Intervals, Tip } from './AmountEditor.styled';
import AmountInterval from './AmountInterval';
import { ElementDetailEditorProps } from 'components/pageEditor/editInterface/ElementEditor.types';

export type AmountEditorProps = ElementDetailEditorProps<AmountElement['content']>;

export function AmountEditor({ contributionIntervals, elementContent, onChangeElementContent }: AmountEditorProps) {
  useEffect(() => {
    // Migrate legacy data to the new format.
    if (elementContent.allowOther) {
      onChangeElementContent({
        ...elementContent,
        options: Object.entries(elementContent.options).reduce(
          (acc, [interval, options]) => ({
            ...acc,
            [interval]: options.includes('other') ? options : [...options, 'other']
          }),
          {}
        ),
        allowOther: undefined
      });
    }
  }, [elementContent, onChangeElementContent]);

  function handleAddAmount(interval: ContributionInterval, value: number | 'other') {
    // Keep the list of amounts sorted numerically with "other" as last.
    const newInterval = [...(elementContent.options[interval] ?? []), value].sort((a, b) => {
      if (a === 'other') {
        return 1;
      }

      if (b === 'other') {
        return -1;
      }

      return a - b;
    });

    onChangeElementContent({
      ...elementContent,
      options: {
        ...elementContent.options,
        [interval]: newInterval
      }
    });
  }

  function handleRemoveAmount(interval: ContributionInterval, value: number | 'other') {
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

  function handleOtherChange(interval: ContributionInterval) {
    if (elementContent.options[interval]?.includes('other')) {
      handleRemoveAmount(interval, 'other');
    } else {
      handleAddAmount(interval, 'other');
    }
  }

  // Legacy data may give us amounts set as strings. We convert here so that
  // child components don't have to deal with this complexity.
  return (
    <div data-testid="amount-editor">
      <p>Highlighted amounts will be selected by default on live donation pages. Click an amount to highlight.</p>
      <Tip>Tip: We've pre-selected the most common contribution amounts.</Tip>
      <Intervals>
        {contributionIntervals.map(({ interval }) => (
          <Fragment key={interval}>
            <AmountInterval
              defaultOption={
                elementContent.defaults && elementContent.defaults[interval]
                  ? parseFloat(elementContent.defaults[interval] as unknown as string)
                  : undefined
              }
              interval={interval}
              options={
                elementContent.options[interval]
                  ?.filter((item) => item !== 'other')
                  .map((value) => parseFloat(value as unknown as string)) ?? []
              }
              onAddAmount={(value) => handleAddAmount(interval, value)}
              onRemoveAmount={(value) => handleRemoveAmount(interval, value)}
              onSetDefaultAmount={(value) => handleSetDefaultAmount(interval, value)}
            />
            <AllowOtherFormControlLabel
              control={
                <Checkbox
                  data-testid={`allow-other-${interval}`}
                  checked={elementContent.options[interval]?.includes('other')}
                  onChange={() => handleOtherChange(interval)}
                />
              }
              label='Include "other" as an option'
            />
          </Fragment>
        ))}
      </Intervals>
    </div>
  );
}

export default AmountEditor;
