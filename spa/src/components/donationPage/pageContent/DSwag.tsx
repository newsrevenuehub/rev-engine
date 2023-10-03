import PropTypes, { InferProps } from 'prop-types';
import { ChangeEvent, useMemo, useState } from 'react';
import { Checkbox, FormControlLabel, MenuItem } from 'components/base';
import { CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';
import { SwagElement } from 'hooks/useContributionPage';
import { usePage } from '../DonationPage';
import DElement from './DElement';
import { Controls, TextField, ThresholdDescription } from './DSwag.styled';
import { cleanSwagValue } from 'utilities/swagValue';

const DSwagPropTypes = {
  element: PropTypes.object.isRequired,
  live: PropTypes.bool
};

export interface DSwagProps extends InferProps<typeof DSwagPropTypes> {
  element: SwagElement;
}

export function DSwag(props: DSwagProps) {
  const { element, live } = props;
  const { page, frequency, amount } = usePage();

  // Legacy deta may have a string value for the swag threshold, e.g. "240"
  // instead of 240.

  const numericThreshold =
    typeof element.content.swagThreshold === 'string'
      ? parseFloat(element.content.swagThreshold)
      : element.content.swagThreshold;

  const [optOut, setOptOut] = useState(element.content.optOutDefault ?? false);
  const [swagChoices, setSwagChoices] = useState<string[]>([]);
  const meetsThreshold = useMemo(() => {
    // Avoiding ! here because it would be true for 0.

    if (amount === undefined) {
      return false;
    }

    let annualAmount = amount;

    if (frequency === CONTRIBUTION_INTERVALS.MONTHLY) {
      annualAmount *= 12;
    }

    // Other frequencies are annual or one-time.

    return annualAmount >= numericThreshold;
  }, [amount, frequency, numericThreshold]);

  function handleSwagOptOutChange(event: ChangeEvent<HTMLInputElement>) {
    setOptOut(event.target.checked);

    // If we just opted out of swag, clear previous choices.

    if (event.target.checked) {
      setSwagChoices([]);
    }
  }

  function handleSwagChoicesChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number) {
    setSwagChoices((existing) => {
      const changed = [...existing];

      changed[index] = event.target.value;
      return changed;
    });
  }

  // If there are no swag choices configured and we're on a live page, show
  // nothing. This should only happen if the user didn't configure any.

  if (live && (element.content.swags[0]?.swagOptions ?? []).length === 0) {
    return null;
  }

  // We assume we are the only swag element on the page (hopefully guaranteed by
  // setting unique below to true), and set the field name to swag_choices so
  // that the value matches what our Stripe metadata spec.

  return (
    <DElement label="Member benefits" {...props} data-testid="d-swag">
      {numericThreshold > 0 && (
        <ThresholdDescription>
          Give a total of {page.currency?.symbol ?? ''}
          {element.content.swagThreshold} {page.currency?.code ?? ''} / year or more to be eligible
        </ThresholdDescription>
      )}
      {meetsThreshold && (
        <Controls data-testid="swag-content">
          <FormControlLabel
            control={<Checkbox checked={optOut} name="swag_opt_out" onChange={handleSwagOptOutChange} />}
            label="Maximize my contribution–I'd rather not receive member merchandise."
          />
          {element.content.swags?.map(({ swagName, swagOptions }, index) => (
            <TextField
              defaultValue=""
              disabled={optOut}
              id="dswag-swag-choices"
              // We remove the name of the field if opting out so it isn't sent in form data.
              name={optOut ? undefined : 'swag_choices'}
              label={swagName}
              onChange={(event) => handleSwagChoicesChange(event, index)}
              required={!optOut}
              select
              value={swagChoices[index] ?? ''}
              key={swagName}
            >
              {swagOptions.map((value) => (
                <MenuItem value={`${cleanSwagValue(swagName)}:${cleanSwagValue(value)}`} key={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
          ))}
        </Controls>
      )}
    </DElement>
  );
}

DSwag.propTypes = DSwagPropTypes;
DSwag.type = 'DSwag';
DSwag.displayName = 'Contributor Benefits';
DSwag.description = 'Allow contributors to make choices about optional swag';
DSwag.required = false;
DSwag.unique = true;

export default DSwag;
