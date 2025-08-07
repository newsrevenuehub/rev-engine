import { ContributionInterval } from 'constants/contributionIntervals';
import PropTypes, { InferProps } from 'prop-types';
import { Fieldset, Heading, Label, Prompt } from './common.styled';
import { Fields } from './Interval.styled';

const IntervalPropTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired
};

export interface IntervalProps extends InferProps<typeof IntervalPropTypes> {
  onChange: (value: ContributionInterval) => void;
  value: ContributionInterval;
}

const intervals: { label: string; value: ContributionInterval }[] = [
  { label: 'One-time', value: 'one_time' },
  { label: 'Monthly', value: 'month' },
  { label: 'Yearly', value: 'year' }
];

export function Interval({ value, onChange }: IntervalProps) {
  return (
    <Fieldset>
      <Heading>Frequency</Heading>
      <Prompt>Choose a contribution type</Prompt>
      <Fields>
        {intervals.map((interval) => (
          <span key={interval.value}>
            <input
              checked={value === interval.value}
              onChange={() => onChange(interval.value)}
              type="radio"
              name="frequency"
              value={interval.value}
              id={`frequency-${interval.value}`}
            />
            <Label htmlFor={`frequency-${interval.value}`}>{interval.label}</Label>
          </span>
        ))}
      </Fields>
    </Fieldset>
  );
}

Interval.propTypes = IntervalPropTypes;
export default Interval;
