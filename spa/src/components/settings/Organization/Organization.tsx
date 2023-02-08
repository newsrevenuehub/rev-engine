import { Controller, useForm } from 'react-hook-form';
import MaskedInput from 'react-input-mask';

import HeaderSection from 'components/common/HeaderSection';
import SettingsSection from 'components/common/SettingsSection';
import SubheaderSection from 'components/common/SubheaderSection';
import { TextField, MenuItem } from 'components/base';
import GlobalLoading from 'elements/GlobalLoading';
import useUser from 'hooks/useUser';

import {
  Content,
  FieldLabelOptional,
  InputWrapper,
  StyledTextField,
  TaxStatusContainer,
  TaxStatusInfoTooltip,
  Wrapper
} from './Organization.styled';

const Organization = () => {
  const { user, isLoading } = useUser();
  const currentOrganization = user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined;

  const { control } = useForm({
    defaultValues: {
      // TODO: update values when BE returns the correct data
      companyName: currentOrganization?.name,
      companyTaxStatus: currentOrganization?.fiscal_status,
      taxId: currentOrganization?.tax_id
    }
  });

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
                  <TextField fullWidth id="settings-company-tax-status" disabled label="Tax Status" {...field} select>
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
              rules={{ pattern: { value: /[0-9]{2}-[0-9]{7}/, message: 'EIN must have 9 digits' } }}
              render={({ field }) => (
                <MaskedInput mask="99-9999999" {...field} disabled>
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
                      disabled
                    />
                  )}
                </MaskedInput>
              )}
            />
          </InputWrapper>
        </SettingsSection>
      </Content>
    </Wrapper>
  );
};

export default Organization;
