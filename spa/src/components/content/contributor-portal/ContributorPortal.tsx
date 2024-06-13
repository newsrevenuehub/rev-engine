import SaveIcon from '@material-design-icons/svg/outlined/save.svg?react';
import { AxiosError } from 'axios';
import { Button, TextField, PhoneTextField } from 'components/base';
import Hero from 'components/common/Hero';
import SuccessBanner from 'components/common/SuccessBanner';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { GENERIC_ERROR } from 'constants/textConstants';
import { RevenueProgram } from 'hooks/useContributionPage';
import { useRevenueProgram } from 'hooks/useRevenueProgram';
import PropTypes, { InferProps } from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useAlert } from 'react-alert';
import { Controller, useForm } from 'react-hook-form';
import { SectionWrapper } from '../pages/Pages.styled';
import { ActionWrapper, Description, FormWrapper, InputsWrapper, Label } from './ContributorPortal.styles';

type ContactInfoFormFields = Pick<RevenueProgram, 'contact_email' | 'contact_phone'>;

export interface ContributorPortalProps extends InferProps<typeof ContributorPortalPropTypes> {
  revenueProgram?: RevenueProgram;
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

  const submit = async (data: ContactInfoFormFields) => {
    setErrorMessage(undefined);

    if (typeof updateRevenueProgram !== 'function') {
      // Should never happen
      throw new Error('RevenueProgram ID is not defined.');
    }

    try {
      await updateRevenueProgram(data);
      setShowSuccess(true);
    } catch (error) {
      setShowSuccess(false);

      const axiosError = error as AxiosError;
      if (axiosError.response?.data) {
        setErrorMessage({
          contact_email: axiosError.response.data?.contact_email?.[0],
          contact_phone: axiosError.response.data?.contact_phone?.[0]
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
            disabled={!isDifferent}
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
          <Button startIcon={<SaveIcon />} disabled={!isDifferent} color="primaryDark" type="submit">
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
