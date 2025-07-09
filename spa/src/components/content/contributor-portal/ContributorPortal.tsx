import SaveIcon from '@material-design-icons/svg/outlined/save.svg?react';
import { AxiosError } from 'axios';
import PropTypes, { InferProps } from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useAlert } from 'react-alert';
import { Controller, useForm } from 'react-hook-form';
import { Button, TextField, PhoneTextField } from 'components/base';
import Hero from 'components/common/Hero';
import SuccessBanner from 'components/common/SuccessBanner';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { GENERIC_ERROR } from 'constants/textConstants';
import { UpdateRevenueProgramErrors, useRevenueProgram } from 'hooks/useRevenueProgram';
import { RevenueProgramForUser } from 'hooks/useUser.types';
import { SectionWrapper } from '../pages/Pages.styled';
import { ActionWrapper, Description, FormWrapper, InputsWrapper, Label } from './ContributorPortal.styles';

type ContactInfoFormFields = Pick<RevenueProgramForUser, 'contact_email' | 'contact_phone'>;

export interface ContributorPortalProps extends InferProps<typeof ContributorPortalPropTypes> {
  revenueProgram?: RevenueProgramForUser;
}

const ContributorPortal = ({ revenueProgram }: ContributorPortalProps) => {
  const alert = useAlert();
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<Record<keyof ContactInfoFormFields, string>>();
  const { updateRevenueProgram } = useRevenueProgram(revenueProgram?.id);

  const {
    control,
    watch,
    reset,
    handleSubmit,
    formState: { errors }
  } = useForm<ContactInfoFormFields>({
    defaultValues: {
      contact_email: revenueProgram?.contact_email ?? '',
      contact_phone: revenueProgram?.contact_phone ?? ''
    }
  });

  const contact_email = watch('contact_email');
  const contact_phone = watch('contact_phone');

  useEffect(() => {
    setShowSuccess(false);
  }, [contact_email, contact_phone, setShowSuccess]);

  const isDifferent = useMemo(
    () =>
      contact_email !== (revenueProgram?.contact_email ?? '') ||
      contact_phone !== (revenueProgram?.contact_phone ?? ''),
    [contact_email, contact_phone, revenueProgram?.contact_email, revenueProgram?.contact_phone]
  );

  const onlyCountryCode = contact_phone.length > 0 && contact_phone.length < 6;
  // Disable buttons if the phone number is only a country code and the revenue program does not have a phone number to "Cancel Changes" to;
  // or if the form is not different from the revenue program
  const disableButton = (onlyCountryCode && !revenueProgram?.contact_phone) || !isDifferent;

  const submit = async (data: ContactInfoFormFields) => {
    setErrorMessage(undefined);

    if (typeof updateRevenueProgram !== 'function') {
      // Should never happen
      throw new Error('RevenueProgram ID is not defined.');
    }

    try {
      await updateRevenueProgram({
        contact_email: data.contact_email,
        contact_phone: onlyCountryCode ? '' : data.contact_phone
      });
      setShowSuccess(true);
    } catch (error) {
      setShowSuccess(false);

      const axiosError = error as AxiosError<UpdateRevenueProgramErrors>;
      if (axiosError.response?.data) {
        setErrorMessage({
          contact_email: axiosError.response.data?.contact_email?.[0] ?? '',
          contact_phone: axiosError.response.data?.contact_phone?.[0] ?? ''
        });

        return;
      }

      alert.error(GENERIC_ERROR);
    }
  };

  return (
    <GenericErrorBoundary>
      <Hero
        title="Contributor Portal"
        subtitle="Edit the contact information, links, and CTAs on your contributor portal."
      />
      <FormWrapper onSubmit={handleSubmit(submit)}>
        <SectionWrapper>
          <Label>Contact Information</Label>
          <Description>
            Input the phone number and email address contributors should use when reaching out with an issue or
            question.
            <br />
            <span>This will not change your RevEngine account contact details.</span>
          </Description>
          <InputsWrapper>
            <Controller
              name="contact_phone"
              control={control}
              render={({ field }) => (
                <PhoneTextField
                  {...field}
                  fullWidth
                  id="contact-phone"
                  label="Phone Number"
                  error={!!errors.contact_phone || !!errorMessage?.contact_phone}
                  helperText={errors?.contact_phone?.message || errorMessage?.contact_phone}
                />
              )}
            />
            <Controller
              name="contact_email"
              control={control}
              rules={{
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: 'Please enter a valid email address.'
                },
                maxLength: {
                  value: 255,
                  message: 'Email address must be less than 255 characters.'
                }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  id="contact-email"
                  label="Email Address"
                  type="email"
                  error={!!errors.contact_email || !!errorMessage?.contact_email}
                  helperText={errors?.contact_email?.message || errorMessage?.contact_email}
                />
              )}
            />
          </InputsWrapper>
        </SectionWrapper>
        <ActionWrapper>
          <Button
            color="secondary"
            disabled={disableButton}
            onClick={() => {
              reset({
                contact_email: revenueProgram?.contact_email ?? '',
                contact_phone: revenueProgram?.contact_phone ?? ''
              });
              setErrorMessage(undefined);
            }}
          >
            Cancel Changes
          </Button>
          <Button startIcon={<SaveIcon />} disabled={disableButton} color="primaryDark" type="submit">
            Save
          </Button>
        </ActionWrapper>
        {showSuccess && <SuccessBanner message="Successfully saved details!" />}
      </FormWrapper>
    </GenericErrorBoundary>
  );
};

const ContributorPortalPropTypes = {
  revenueProgram: PropTypes.object
};

ContributorPortal.propTypes = ContributorPortalPropTypes;

export default ContributorPortal;
