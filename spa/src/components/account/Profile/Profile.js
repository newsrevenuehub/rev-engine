import { useReducer } from 'react';
import { useHistory } from 'react-router-dom';
import * as S from './Profile.styled';
import * as A from 'components/account/Account.styled';

// AJAX
import axios from 'ajax/axios';
import { CUSTOMIZE_ACCOUNT_ENDPOINT } from 'ajax/endpoints';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_FAILURE, FETCH_SUCCESS } from 'state/fetch-reducer';
import { useUserContext } from 'components/UserContext';

import useModal from 'hooks/useModal';

// Analytics
import { useConfigureAnalytics } from 'components/analytics';

import ProfileForm from './ProfileForm';

function Profile() {
  const { open, handleClose } = useModal(true);
  const history = useHistory();
  const [profileState, dispatch] = useReducer(fetchReducer, initialState);
  const { user } = useUserContext();
  useConfigureAnalytics();

  const onProfileSubmit = async (formData) => {
    dispatch({ type: FETCH_START });

    try {
      const { data, status } = await axios.patch(`users/${user.id}/${CUSTOMIZE_ACCOUNT_ENDPOINT}`, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        // Don't send job_title at all if the user omitted it.
        job_title: formData.jobTitle.trim() !== '' ? formData.jobTitle : undefined,
        organization_name: formData.companyName,
        organization_tax_status: formData.companyTaxStatus
      });

      if (status === 204) {
        dispatch({ type: FETCH_SUCCESS });
        history.push('/');
      } else {
        dispatch({ type: FETCH_FAILURE, payload: data });
      }
    } catch (e) {
      // If we didn't get a specific error message from the API, default to
      // something generic.

      dispatch({ type: FETCH_FAILURE, payload: e?.response?.data ?? [new Error('Request failed')] });
    }
  };

  const formSubmitErrors = profileState?.errors?.length && 'An Error Occurred';

  return (
    <S.Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="profile-modal-title"
      data-testid="finalize-profile-modal"
    >
      <S.Profile>
        <S.h1 id="profile-modal-title">Let's Customize Your Account</S.h1>
        <S.Description>Help us create your personalized experience!</S.Description>
        <ProfileForm onProfileSubmit={onProfileSubmit} disabled={profileState.loading} />
        {formSubmitErrors ? (
          <A.Message data-testid="profile-modal-error">{formSubmitErrors}</A.Message>
        ) : (
          <A.MessageSpacer />
        )}
      </S.Profile>
    </S.Modal>
  );
}

export default Profile;
