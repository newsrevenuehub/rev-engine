import { useReducer } from 'react';
import * as S from './Profile.styled';
import * as A from 'components/account/Account.styled';

// AJAX
import axios from 'ajax/axios';
import { CUSTOMIZE_ACCOUNT_ENDPOINT } from 'ajax/endpoints';

// State management
import fetchReducer, { initialState, FETCH_START, FETCH_FAILURE } from 'state/fetch-reducer';
import { useUserContext } from 'components/UserContext';

import useModal from 'hooks/useModal';

import BottomNav from 'assets/icons/bottomNav.svg';

// Analytics
import { useConfigureAnalytics } from 'components/analytics';

import ProfileForm from './ProfileForm';

function Profile() {
  useConfigureAnalytics();

  const { open, handleClose } = useModal(true);
  const [profileState, dispatch] = useReducer(fetchReducer, initialState);

  const { user } = useUserContext();

  const onProfileSubmit = async (fdata) => {
    dispatch({ type: FETCH_START });
    try {
      const { data, status } = await axios.patch(`users/${user.id}/${CUSTOMIZE_ACCOUNT_ENDPOINT}`, {
        first_name: fdata.firstName,
        last_name: fdata.lastName,
        job_title: fdata.jobTitle,
        organization_name: fdata.companyName,
        organization_tax_status: fdata.companyTaxStatus
      });
      if (status === 204) {
        window.location.href = '/';
      } else {
        dispatch({ type: FETCH_FAILURE, payload: data });
      }
    } catch (e) {
      dispatch({ type: FETCH_FAILURE, payload: e?.response?.data });
    }
  };

  const formSubmitErrors =
    Array.isArray(profileState?.errors) && profileState?.errors.length === 0 ? null : 'An Error Occured';

  return (
    <S.Modal open={open} onClose={handleClose} aria-labelledby="Profile Modal">
      <S.Profile>
        <S.h1>Let's Customize Your Account</S.h1>
        <S.Description>Help us create your personalized experience!</S.Description>
        <ProfileForm onProfileSubmit={onProfileSubmit} loading={profileState.loading} />
        {formSubmitErrors ? <A.Message>{formSubmitErrors}</A.Message> : <A.MessageSpacer />}

        <S.BottomNav src={BottomNav} />
      </S.Profile>
    </S.Modal>
  );
}

export default Profile;
