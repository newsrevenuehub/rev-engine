import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useAlert } from 'react-alert';
import { Controller, useForm } from 'react-hook-form';
import MaskedInput from 'react-input-mask';

import axios from 'ajax/axios';
import { PATCH_ORGANIZATION, PATCH_REVENUE_PROGRAM } from 'ajax/endpoints';
import { Button, MenuItem, TextField } from 'components/base';
import HeaderSection from 'components/common/HeaderSection';
import SettingsSection from 'components/common/SettingsSection';
import SubheaderSection from 'components/common/SubheaderSection';
import { TAX_STATUS } from 'constants/fiscalStatus';
import { HELP_URL } from 'constants/helperUrls';
import { GENERIC_ERROR } from 'constants/textConstants';
import GlobalLoading from 'elements/GlobalLoading';
import useUser from 'hooks/useUser';
import { getUserRole } from 'utilities/getUserRole';

import {
  ActionWrapper,
  ContentForm,
  Disclaimer,
  FieldLabelOptional,
  InfoTooltip,
  InputWrapper,
  Link,
  StyledTextField,
  TooltipContainer,
  Wrapper
} from './Organization.styled';

export type OrganizationFormFields = {
  companyName: string;
  companyTaxStatus: string;
  taxId: string;
};

const Organization = () => {
  const alert = useAlert();
  const queryClient = useQueryClient();
  const { user, isLoading } = useUser();
  const currentOrganization = useMemo(
    () => (user?.organizations?.length === 1 ? user?.organizations?.[0] : undefined),
    [user?.organizations]
  );
  const revenueProgramFromCurrentOrg = useMemo(
    () => user?.revenue_programs?.filter((rp) => rp.organization === currentOrganization?.id),
    [currentOrganization?.id, user?.revenue_programs]
  );
  const hasMultipleRPs = revenueProgramFromCurrentOrg && revenueProgramFromCurrentOrg?.length > 1;

  const { isOrgAdmin } = getUserRole(user);

  const { control, watch, reset, handleSubmit } = useForm<OrganizationFormFields>({
    defaultValues: {
      companyName: currentOrganization?.name ?? '',
      companyTaxStatus: revenueProgramFromCurrentOrg?.[0]?.fiscal_status ?? '',
      taxId: revenueProgramFromCurrentOrg?.[0]?.tax_id ?? ''
    }
  });
  const companyName = watch('companyName');
  const companyTaxStatus = watch('companyTaxStatus');
  const taxId = watch('taxId');

  const isDifferent = useMemo(
    () => ({
      companyName: companyName !== (currentOrganization?.name ?? ''),
      companyTaxStatus: companyTaxStatus !== (revenueProgramFromCurrentOrg?.[0]?.fiscal_status ?? ''),
      taxId: taxId.replace(/-/g, '') !== (revenueProgramFromCurrentOrg?.[0]?.tax_id ?? '')
    }),
    [companyName, companyTaxStatus, currentOrganization, revenueProgramFromCurrentOrg, taxId]
  );

  const updateOrganizationNameMutation = useMutation(
    (name: string) => {
      if (!currentOrganization) {
        throw new Error('Organization is not yet defined');
      }

      return axios.patch(`${PATCH_ORGANIZATION}${currentOrganization.id}/`, { name });
    },
    {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user'] })
    }
  );

  const updateRevenueProgramMutation = useMutation(
    ({ tax_id, fiscal_status }: { tax_id: string; fiscal_status: string }) => {
      if (!revenueProgramFromCurrentOrg?.length) {
        throw new Error('Revenue Program is not yet defined');
      }
      return axios.patch(`${PATCH_REVENUE_PROGRAM}${revenueProgramFromCurrentOrg[0].id}/`, {
        tax_id: tax_id.replace('-', ''),
        fiscal_status
      });
    },
    {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user'] })
    }
  );

  const submit = useCallback(
    async (form: OrganizationFormFields) => {
      try {
        if (isDifferent.companyName) {
          await updateOrganizationNameMutation.mutateAsync(form.companyName);
        }
        if (isDifferent.companyTaxStatus || isDifferent.taxId) {
          await updateRevenueProgramMutation.mutateAsync({
            tax_id: form.taxId,
            fiscal_status: form.companyTaxStatus
          });
        }
      } catch (error) {
        console.error(error);
        alert.error(GENERIC_ERROR);
      }
    },
    [
      alert,
      isDifferent.companyName,
      isDifferent.companyTaxStatus,
      isDifferent.taxId,
      updateOrganizationNameMutation,
      updateRevenueProgramMutation
    ]
  );

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
              <TextField fullWidth id="settings-company-name" label="Display Name" disabled={!isOrgAdmin} {...field} />
            )}
          />
        </SettingsSection>
        <SettingsSection
          title="Organization Tax Status"
          subtitle={
            hasMultipleRPs ? (
              <>
                Your Organization's tax status and EIN are managed by our Staff. For help, please contact{' '}
                <Link href={HELP_URL} target="_blank">
                  Support
                </Link>
                .{' '}
                <Disclaimer>
                  The status is used to calculate fees associated with contributions. For nonprofits, tax ID (EIN) will
                  be included on contributor receipts.
                </Disclaimer>
              </>
            ) : (
              'The status is used to calculate fees associated with contributions. For nonprofits, tax ID (EIN) will be included on contributor receipts.'
            )
          }
        >
          {!hasMultipleRPs && (
            <InputWrapper>
              <TooltipContainer>
                <Controller
                  name="companyTaxStatus"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      id="settings-company-tax-status"
                      label="Tax Status"
                      disabled={!isOrgAdmin}
                      select
                    >
                      <MenuItem value={TAX_STATUS.NONPROFIT}>Nonprofit</MenuItem>
                      <MenuItem value={TAX_STATUS.FOR_PROFIT}>For-profit</MenuItem>
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
                  rules={{ pattern: { value: /[0-9]{2}-[0-9]{7}|[0-9]{9}/, message: 'EIN must have 9 digits' } }}
                  render={({ field }) => (
                    <MaskedInput mask="99-9999999" {...field} disabled={!isOrgAdmin}>
                      {(inputProps: any) => (
                        <StyledTextField
                          fullWidth
                          disabled={!isOrgAdmin}
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
              </TooltipContainer>
            </InputWrapper>
          )}
        </SettingsSection>
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
