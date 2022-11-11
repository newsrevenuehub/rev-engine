import { useReducer } from 'react';
import { useHistory } from 'react-router-dom';
import * as S from './Profile.styled';
import * as A from 'components/account/Account.styled';

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

function Profile() {
  const { open } = useModal(true);
  const history = useHistory();
  const [profileState, dispatch] = useReducer(fetchReducer, initialState);
  const { refetch: refetchUser, user } = useUser();
  useConfigureAnalytics();

  const onProfileSubmit = async (formData: ProfileFormFields) => {
    dispatch({ type: FETCH_START });

    try {
      const { data, status } = await axios.patch(`users/${user?.id}/${CUSTOMIZE_ACCOUNT_ENDPOINT}`, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        organization_name: formData.companyName,
        organization_tax_status: formData.companyTaxStatus,
        // Don't send job_title or organization_tax_id at all if the user omitted it.
        job_title: formData.jobTitle.trim() !== '' ? formData.jobTitle : undefined,
        organization_tax_id: formData.taxId.replace('-', '').replace('_', '') || undefined
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
      let errorMessage = e?.message && [e.message];
      if (e?.response?.data) {
        if (typeof e?.response?.data === 'object') {
          errorMessage = Object.values(e?.response?.data)[0];
        } else {
          errorMessage = e?.response?.data;
        }
      }
      dispatch({ type: FETCH_FAILURE, payload: errorMessage ?? ['An Error Occurred'] });
    }
  };

  const formSubmitErrors = profileState?.errors?.length && profileState?.errors[0];

  return (
    <S.Modal open={open} aria-labelledby="profile-modal-title" data-testid="finalize-profile-modal">
      <S.Profile>
        <OffscreenText>Step 1 of 2</OffscreenText>
        <S.Title id="profile-modal-title">Let's Customize Your Account</S.Title>
        <S.Description>Help us create your personalized experience!</S.Description>
        <ProfileForm onProfileSubmit={onProfileSubmit} disabled={profileState.loading} error={formSubmitErrors} />
        <StepperDots aria-hidden activeStep={0} steps={2} />
      </S.Profile>
    </S.Modal>
  );
}

export default Profile;
