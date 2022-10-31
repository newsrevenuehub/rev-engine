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

import ProfileForm, { FormDataType } from './ProfileForm';
import { OffscreenText, StepperDots } from 'components/base';

function Profile() {
  const { open } = useModal(true);
  const history = useHistory();
  const [profileState, dispatch] = useReducer(fetchReducer, initialState);
  const { refetch: refetchUser, user } = useUser();
  useConfigureAnalytics();

  const onProfileSubmit = async (formData: FormDataType) => {
    dispatch({ type: FETCH_START });

    try {
      const { data, status } = await axios.patch(`users/${user.id}/${CUSTOMIZE_ACCOUNT_ENDPOINT}`, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        // Don't send job_title at all if the user omitted it.
        job_title: formData.jobTitle.trim() !== '' ? formData.jobTitle : undefined,
        organization_name: formData.companyName,
        organization_tax_status: formData.companyTaxStatus,
        organization_tax_id: Number(formData.taxId)
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
      const errorMessage =
        typeof e?.response?.data === 'object' ? Object.values(e?.response?.data)[0] : e?.response?.data;
      dispatch({ type: FETCH_FAILURE, payload: errorMessage ?? [new Error('Request failed')] });
    }
  };

  const formSubmitErrors = profileState?.errors?.length && profileState?.errors[0];

  return (
    <S.Modal open={open} aria-labelledby="profile-modal-title" data-testid="finalize-profile-modal">
      <S.Profile>
        <OffscreenText>Step 1 of 2</OffscreenText>
        <S.Title id="profile-modal-title">Let's Customize Your Account</S.Title>
        <S.Description>Help us create your personalized experience!</S.Description>
        <ProfileForm onProfileSubmit={onProfileSubmit} disabled={profileState.loading} />
        {formSubmitErrors ? (
          <A.Message data-testid="profile-modal-error">{formSubmitErrors}</A.Message>
        ) : (
          <A.MessageSpacer />
        )}
        <StepperDots aria-hidden activeStep={0} steps={2} />
      </S.Profile>
    </S.Modal>
  );
}

export default Profile;
