import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent } from 'react';
import { Checkbox } from 'components/base';
import { ContributionInterval } from 'constants/contributionIntervals';
import { AmountElement } from 'hooks/useContributionPage';
import { ContributionIntervalList } from 'utilities/getPageContributionIntervals';
import { AllowOtherFormControlLabel, Intervals, Tip } from './AmountEditor.styled';
import AmountInterval from './AmountInterval';

const AmountEditorPropTypes = {
  contributionIntervals: PropTypes.array.isRequired,
  elementContent: PropTypes.object.isRequired
};

export interface AmountEditorProps extends InferProps<typeof AmountEditorPropTypes> {
  contributionIntervals: ContributionIntervalList;
  elementContent: AmountElement['content'];
  onChangeElementContent: (value: AmountElement['content']) => void;
}

export function AmountEditor({ contributionIntervals, elementContent, onChangeElementContent }: AmountEditorProps) {
  function handleAddAmount(interval: ContributionInterval, value: number) {
    onChangeElementContent({
      ...elementContent,
      options: {
        ...elementContent.options,
        [interval]: [...(elementContent.options[interval] ?? []), value]
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

AmountEditor.propTypes = AmountEditorPropTypes;
export default AmountEditor;
