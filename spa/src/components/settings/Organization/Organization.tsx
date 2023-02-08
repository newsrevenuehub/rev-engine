import { useMemo } from 'react';
import { ReactComponent as InfoIcon } from '@material-design-icons/svg/outlined/info.svg';
import { Controller, useForm } from 'react-hook-form';
import MaskedInput from 'react-input-mask';

import { MenuItem, TextField } from 'components/base';
import HeaderSection from 'components/common/HeaderSection';
import SettingsSection from 'components/common/SettingsSection';
import SubheaderSection from 'components/common/SubheaderSection';
import GlobalLoading from 'elements/GlobalLoading';
import useUser from 'hooks/useUser';

import {
  Content,
  FieldLabelOptional,
  InputWrapper,
  StyledTextField,
  TaxStatusContainer,
  TaxStatusInfoTooltip,
  WarningMessage,
  Wrapper
} from './Organization.styled';

const Organization = () => {
  const { user, isLoading } = useUser();
  const currentOrganization = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  const { control, watch } = useForm({
    defaultValues: {
      // TODO: update values when BE returns the correct data
      companyName: currentOrganization?.name ?? '',
      companyTaxStatus: currentOrganization?.fiscal_status ?? '',
      taxId: currentOrganization?.tax_id ?? ''
    }
  });

  const companyName = watch('companyName');
  const companyTaxStatus = watch('companyTaxStatus');
  const taxId = watch('taxId');

  const isDifferent = useMemo(
    () => ({
      companyName: companyName !== currentOrganization?.name,
      companyTaxStatus: companyTaxStatus !== currentOrganization?.fiscal_status,
      taxId: taxId.replace(/-/g, '') !== currentOrganization?.tax_id
    }),
    [
      companyName,
      companyTaxStatus,
      currentOrganization?.fiscal_status,
      currentOrganization?.name,
      currentOrganization?.tax_id,
      taxId
    ]
  );

  if (isLoading) return <GlobalLoading />;

  return (
    <Wrapper>
      <HeaderSection title="Settings" />
      <SubheaderSection title="Organization" />
      <Content>
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
          subtitle="The status is used to calculate fees associated with contributions. For non-profits, tax ID (EIN) will be included on contributor receipts."
        >
          <InputWrapper>
            <TaxStatusContainer>
              <Controller
                name="companyTaxStatus"
                control={control}
                render={({ field }) => (
                  <TextField fullWidth id="settings-company-tax-status" label="Tax Status" {...field} select>
                    <MenuItem value="nonprofit">Nonprofit</MenuItem>
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
              rules={{ pattern: { value: /[0-9]{2}-[0-9]{7}/, message: 'EIN must have 9 digits' } }}
              render={({ field }) => (
                <MaskedInput mask="99-9999999" {...field}>
                  {(inputProps: any) => (
                    <StyledTextField
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
      </Content>
    </Wrapper>
  );
};

export default Organization;
