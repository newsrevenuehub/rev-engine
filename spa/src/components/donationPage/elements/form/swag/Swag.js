import { useState } from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import { Select } from '@material-ui/core';

function Swag({
  headerText,
  swagThreshold,
  optOutDefaultChecked,
  optOutLabelText,
  optOutName,
  swagItemName,
  swagItemLabelText,
  swagItemOptions,
  swagThresholdMet
}) {
  const { control, register } = useFormContext();

  const [optOutChoice, setOptOutChoice] = useState(optOutDefaultChecked);

  return (
    <fieldset className="w-full max-w-xl">
      <legend>
        <h2 className="text-3xl mb-4">{headerText}</h2>
        <p className="italic mb-5">Give a total of {swagThreshold} per year to be eligible</p>
      </legend>
      {swagThresholdMet && (
        <>
          <div className="mb-5">
            <input
              {...register(optOutName)}
              className="mr-2"
              type="checkbox"
              onChange={(e) => {
                setOptOutChoice(e.target.checked);
              }}
              id={optOutName}
              name={optOutName}
              defaultChecked={optOutDefaultChecked}
            />
            <label htmlFor={optOutName}>{optOutLabelText}</label>
          </div>
          {optOutChoice === false && (
            <div className="flex flex-col gap-3">
              <label htmlFor={swagItemName}>{swagItemLabelText}</label>
              <Controller
                name={swagItemName}
                control={control}
                render={({ field: { onChange } }) => {
                  return (
                    <Select
                      required={true}
                      displayEmpty={true}
                      native={true}
                      variant="outlined"
                      onChange={onChange}
                      id={swagItemName}
                    >
                      {[{ labelText: '', value: '' }, ...swagItemOptions].map(({ labelText, value }, key) => {
                        return (
                          <option key={`${key}{value}`} value={value}>
                            {labelText}
                          </option>
                        );
                      })}
                    </Select>
                  );
                }}
              />
              <p>Your contribution comes with member merchandise. Please choose an option</p>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}

Swag.propTypes = {
  headerText: PropTypes.string.isRequired,
  swagThreshold: PropTypes.number.isRequired,
  optOutDefaultChecked: PropTypes.bool.isRequired,
  optOutLabelText: PropTypes.string.isRequired,
  optOutName: PropTypes.string.isRequired,
  swagItemName: PropTypes.string.isRequired,
  swagItemLabelText: PropTypes.string.isRequired,
  swagItemOptions: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      labelText: PropTypes.string.isRequired
    })
  ).isRequired,
  swagThresholdMet: PropTypes.bool.isRequired
};

Swag.defaultProps = {
  headerText: 'Swag',
  optOutDefaultChecked: false,
  optOutLabelText: "Maximize my contribution – I'd rather not receive member merchandise.",
  optOutName: 'swag-opt-out',
  swagItemName: 'swag-choice'
};

Swag.type = 'DSwag';
Swag.displayName = 'Swag component';
Swag.description = 'Allow donors to make choices about optional swag';
Swag.required = false;
Swag.unique = true;

export default Swag;
