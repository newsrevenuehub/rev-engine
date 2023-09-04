import { useReducer } from 'react';
import { useHistory } from 'react-router-dom';
import * as S from './Profile.styled';

// AJAX
import axios from 'ajax/axios';
import { CUSTOMIZE_ACCOUNT_ENDPOINT } from 'ajax/endpoints';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_FAILURE, FETCH_SUCCESS } from 'state/fetch-reducer';
import useUser from 'hooks/useUser';

import useModal from 'hooks/useModal';

// Analytics
import { useConfigureAnalytics } from 'components/analytics';

import ProfileForm, { ProfileFormFields } from './ProfileForm';
import { OffscreenText, StepperDots } from 'components/base';
import { TAX_STATUS } from 'constants/fiscalStatus';
import { AxiosError } from 'axios';

function Profile() {
  const { open } = useModal(true);
  const history = useHistory();
  const [profileState, dispatch] = useReducer(fetchReducer, initialState);
  const { refetch: refetchUser, user } = useUser();
  useConfigureAnalytics();

  const onProfileSubmit = async (formData: ProfileFormFields) => {
    dispatch({ type: FETCH_START });

    if (!user) {
      // Should never happen under normal circumstances.
      throw new Error('Asked to customize user, but user is undefined');
    }

    try {
      const { data, status } = await axios.patch(`users/${user?.id}/${CUSTOMIZE_ACCOUNT_ENDPOINT}`, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        organization_name: formData.companyName,
        fiscal_status: formData.companyTaxStatus,
        // Don't send job_title or organization_tax_id at all if the user omitted it.
        job_title: formData.jobTitle.trim() !== '' ? formData.jobTitle : undefined,
        organization_tax_id: formData.taxId.replace('-', '').replace('_', '') || undefined,
        // Only send sponsor name if tax status = FISCALLY_SPONSORED
        fiscal_sponsor_name:
          formData.companyTaxStatus === TAX_STATUS.FISCALLY_SPONSORED && formData.fiscalSponsorName.trim() !== ''
            ? formData.fiscalSponsorName
            : undefined
      });

      if (status === 204) {
        dispatch({ type: FETCH_SUCCESS });
        await refetchUser();
        history.push('/');
      } else {
        dispatch({ type: FETCH_FAILURE, payload: data });
      }
    } catch (e: any) {
      // If we didn't get a specific error message from the API, default to
      // something generic.
      let errorMessage = e?.message && { detail: e.message };
      const axiosError = e as AxiosError;
      if (axiosError?.response?.data) {
        errorMessage = axiosError.response.data;
      }
      dispatch({ type: FETCH_FAILURE, payload: errorMessage ?? { detail: 'An Error Occurred' } });
    }
  };

  return (
    <S.Modal open={open} aria-labelledby="profile-modal-title" data-testid="finalize-profile-modal">
      <S.Profile>
        <OffscreenText>Step 1 of 2</OffscreenText>
        <S.Title id="profile-modal-title">Let's Customize Your Account</S.Title>
        <S.Description>Help us create your personalized experience!</S.Description>
        <ProfileForm onProfileSubmit={onProfileSubmit} disabled={profileState.loading} error={profileState?.errors} />
        <StepperDots aria-hidden activeStep={0} steps={2} />
      </S.Profile>
    </S.Modal>
  );
}

export default Profile;
