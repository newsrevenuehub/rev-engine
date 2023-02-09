import { useCallback, useMemo } from 'react';
import { ReactComponent as InfoIcon } from '@material-design-icons/svg/outlined/info.svg';
import { Controller, useForm } from 'react-hook-form';
import MaskedInput from 'react-input-mask';

import { Button, MenuItem, TextField } from 'components/base';
import HeaderSection from 'components/common/HeaderSection';
import SettingsSection from 'components/common/SettingsSection';
import SubheaderSection from 'components/common/SubheaderSection';
import GlobalLoading from 'elements/GlobalLoading';
import { TAX_STATUS } from 'constants/fiscalStatus';
import useUser from 'hooks/useUser';

import {
  ActionWrapper,
  ContentForm,
  FieldLabelOptional,
  InputWrapper,
  StyledTextField,
  TooltipContainer,
  InfoTooltip,
  WarningMessage,
  Wrapper
} from './Organization.styled';

export type OrganizationFormFields = {
  companyName: string;
  companyTaxStatus: string;
  taxId: string;
  fiscalSponsorName: string;
};

const Organization = () => {
  const { user, isLoading } = useUser();
  const currentOrganization = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  const {
    control,
    watch,
    reset,
    handleSubmit,
    formState: { errors }
  } = useForm<OrganizationFormFields>({
    defaultValues: {
      // TODO: update values when BE returns the correct data
      companyName: currentOrganization?.name ?? '',
      companyTaxStatus: currentOrganization?.fiscal_status ?? '',
      taxId: currentOrganization?.tax_id ?? '',
      fiscalSponsorName: currentOrganization?.fiscal_sponsor_name ?? ''
    }
  });

  const companyName = watch('companyName');
  const companyTaxStatus = watch('companyTaxStatus');
  const taxId = watch('taxId');
  const fiscalSponsorName = watch('fiscalSponsorName');

  const isDifferent = useMemo(
    () => ({
      companyName: companyName !== currentOrganization?.name,
      companyTaxStatus: companyTaxStatus !== currentOrganization?.fiscal_status,
      taxId: taxId.replace(/-/g, '') !== currentOrganization?.tax_id,
      fiscalSponsorName: fiscalSponsorName !== currentOrganization?.fiscal_sponsor_name
    }),
    [
      companyName,
      companyTaxStatus,
      currentOrganization?.fiscal_sponsor_name,
      currentOrganization?.fiscal_status,
      currentOrganization?.name,
      currentOrganization?.tax_id,
      fiscalSponsorName,
      taxId
    ]
  );

  const submit = useCallback((form: OrganizationFormFields) => {
    // TODO: implement save when BE ready
    console.log({ form });
  }, []);

  if (isLoading) return <GlobalLoading />;

  return (
    <Wrapper>
      <HeaderSection title="Settings" />
      <SubheaderSection title="Organization" />
      <ContentForm onSubmit={handleSubmit(submit)}>
        <SettingsSection title="Details" subtitle="Update your Organization details and settings here." />
        <SettingsSection
          title="Organization Name"
          subtitle="This will update the name displayed in the navigation menu."
        >
          <Controller
            name="companyName"
            control={control}
            render={({ field }) => (
              <TextField fullWidth id="settings-company-name" label="Display Name" disabled {...field} />
            )}
          />
        </SettingsSection>
        <SettingsSection
          title="Organization Tax Status"
          subtitle="The status is used to calculate fees associated with contributions. For nonprofits, tax ID (EIN) will be included on contributor receipts."
        >
          <InputWrapper>
            <TooltipContainer>
              <Controller
                name="companyTaxStatus"
                control={control}
                render={({ field }) => (
                  <TextField fullWidth id="settings-company-tax-status" label="Tax Status" {...field} select>
                    <MenuItem value={TAX_STATUS.NONPROFIT}>Nonprofit</MenuItem>
                    <MenuItem value={TAX_STATUS.FOR_PROFIT}>For-profit</MenuItem>
                    <MenuItem value={TAX_STATUS.FISCALLY_SPONSORED}>Fiscally Sponsored</MenuItem>
                  </TextField>
                )}
              />
              <InfoTooltip
                buttonLabel="Help for Company Tax Status"
                title="Your tax status determines the contribution fees charged through Stripe."
              />
            </TooltipContainer>
            <TooltipContainer>
              <Controller
                name="taxId"
                control={control}
                rules={{ pattern: { value: /[0-9]{2}-[0-9]{7}/, message: 'EIN must have 9 digits' } }}
                render={({ field }) => (
                  <MaskedInput mask="99-9999999" {...field}>
                    {(inputProps: any) => (
                      <StyledTextField
                        fullWidth
                        id="settings-tax-id"
                        data-testid="profile-tax-id"
                        placeholder="XX-XXXXXXX"
                        label={
                          <>
                            EIN <FieldLabelOptional>Optional</FieldLabelOptional>
                          </>
                        }
                        {...inputProps}
                      />
                    )}
                  </MaskedInput>
                )}
              />
              <InfoTooltip
                buttonLabel="Help for EIN"
                title="If your organization is fiscally sponsored, enter the fiscal sponsor’s EIN."
              />
            </TooltipContainer>
            {companyTaxStatus === TAX_STATUS.FISCALLY_SPONSORED && (
              <Controller
                name="fiscalSponsorName"
                control={control}
                rules={{
                  required: 'Fiscal Sponsor Name is required.',
                  maxLength: {
                    value: 63,
                    message: 'Must be no more than 63 characters'
                  }
                }}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    id="profile-fiscal-sponsor-name"
                    label="Fiscal Sponsor Name"
                    style={{ gridColumnStart: 'span 2' }}
                    error={!!errors.fiscalSponsorName}
                    helperText={errors?.fiscalSponsorName?.message}
                    {...field}
                  />
                )}
              />
            )}
          </InputWrapper>
        </SettingsSection>
        {isDifferent.companyTaxStatus && (
          <WarningMessage>
            <InfoIcon />
            <p>
              Changing your tax status will affect the fees shown on your contribution pages. Failure to match Stripe
              tax settings may result in a loss of funds.
            </p>
          </WarningMessage>
        )}
        {Object.values(isDifferent).includes(true) && (
          <ActionWrapper>
            <Button
              color="secondary"
              onClick={() => {
                reset(undefined, { keepDefaultValues: true });
              }}
            >
              Undo
            </Button>
            <Button color="secondary" type="submit">
              Save
            </Button>
          </ActionWrapper>
        )}
      </ContentForm>
    </Wrapper>
  );
};

export default Organization;
