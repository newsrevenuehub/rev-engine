import { Button, TextField, MenuItem } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { Controller, useForm } from 'react-hook-form';
import {
  FieldLabelOptional,
  FillRow,
  Form,
  TaxStatusContainer,
  TaxStatusInfoTooltip,
  useStyles
} from './ProfileForm.styled';

export const defaultValues = {
  companyName: '',
  // companyTaxStatus needs to be "." so that it shows the default label "Select your status".
  // Using empty string didn't work
  companyTaxStatus: '.',
  firstName: '',
  jobTitle: '',
  lastName: '',
  taxId: ''
};

export type FormDataType = typeof defaultValues;
export interface ProfileFormProps extends InferProps<typeof ProfileFormPropTypes> {
  onProfileSubmit: (form: FormDataType) => void;
}

function ProfileForm({ disabled: disabledProp, onProfileSubmit }: ProfileFormProps) {
  const classes = useStyles();
  const { control, handleSubmit, watch } = useForm({ defaultValues });
  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const companyName = watch('companyName');
  const companyTaxStatus = watch('companyTaxStatus');
  const disabled = disabledProp || !firstName || !lastName || !companyName || companyTaxStatus === '.';

  const onSubmit = (formData: FormDataType) => {
    onProfileSubmit(formData);
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} data-testid="finalize-profile-form">
      <Controller
        name="firstName"
        control={control}
        render={({ field }) => <TextField id="profile-first" label="First Name" {...field} />}
      />
      <Controller
        name="lastName"
        control={control}
        render={({ field }) => <TextField id="profile-last" label="Last Name" {...field} />}
      />
      <FillRow>
        <Controller
          name="jobTitle"
          control={control}
          render={({ field }) => (
            <TextField
              id="profile-job-title"
              fullWidth
              label={
                <>
                  Job Title <FieldLabelOptional>Optional</FieldLabelOptional>
                </>
              }
              {...field}
            />
          )}
        />
      </FillRow>
      <FillRow>
        <Controller
          name="companyName"
          control={control}
          render={({ field }) => <TextField fullWidth id="profile-company-name" label="Company Name" {...field} />}
        />
      </FillRow>
      <TaxStatusContainer>
        <Controller
          name="companyTaxStatus"
          control={control}
          render={({ field }) => (
            <TextField fullWidth id="profile-company-tax-status" label="Company Tax Status" {...field} select>
              {/* Shows "Select your status" label when companyTaxStatus = . (initialState)*/}
              <MenuItem disabled value="." style={{ display: 'none' }}>
                Select your status
              </MenuItem>
              <MenuItem value="nonprofit">Non-profit</MenuItem>
              <MenuItem value="for-profit">For-profit</MenuItem>
            </TextField>
          )}
        />
        <TaxStatusInfoTooltip
          buttonLabel="Help for Company Tax Status"
          title="Your tax status determines the contribution fees charged through Stripe."
        />
      </TaxStatusContainer>
      <Controller
        name="taxId"
        control={control}
        render={({ field }) => (
          <TextField
            id="profile-tax-id"
            placeholder="XX-XXXXXXX"
            type="number"
            className={classes.root}
            label={
              <>
                EIN <FieldLabelOptional>Optional</FieldLabelOptional>
              </>
            }
            {...field}
          />
        )}
      />
      <FillRow>
        <Button disabled={disabled} fullWidth size="extraLarge" type="submit">
          Finalize Account
        </Button>
      </FillRow>
    </Form>
  );
}

const ProfileFormPropTypes = {
  /**
   * Callback when the form is submitted by the user. Form data will be passed
   * as the first argument.
   */
  onProfileSubmit: PropTypes.func.isRequired,
  /**
   * Should the form be disabled?
   */
  disabled: PropTypes.bool
};

ProfileForm.propTypes = ProfileFormPropTypes;

export default ProfileForm;
