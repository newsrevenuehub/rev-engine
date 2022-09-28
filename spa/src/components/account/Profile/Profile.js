import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as S from './Profile.styled';
import * as A from 'components/account/Account.styled';

// AJAX
import axios from 'ajax/axios';
import { CUSTOMIZE_ACCOUNT_ENDPOINT } from 'ajax/endpoints';

// State management
import useUser from 'hooks/useUser';

import useModal from 'hooks/useModal';

// Analytics
import { useConfigureAnalytics } from 'components/analytics';

import ProfileForm from './ProfileForm';

function patchAccountCustomization(userId, data) {
  return axios.patch(`users/${userId}/${CUSTOMIZE_ACCOUNT_ENDPOINT}`, data);
}

function Profile() {
  const { open } = useModal(true);
  const history = useHistory();
  const { user } = useUser();
  const [errors, setErrors] = useState();
  useConfigureAnalytics();

  const queryClient = useQueryClient();

  const { mutate: doProfileCustomization, isLoading: profileCustomizationIsLoading } = useMutation(
    (userId, data) => {
      return patchAccountCustomization(userId, data);
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['user']),
      onError: (err) => {
        // calling console.error will create a Sentry error
        // console.error(err);
        //
        // do the stuff to trigger displaying form errors
        // (side note, this is where RHF would be nice)
        //
      }
    }
  );

  const onProfileSubmit = async (formData) => {
    doProfileCustomization(user.id, {
      first_name: formData.firstName,
      last_name: formData.lastName,
      // Don't send job_title at all if the user omitted it.
      job_title: formData.jobTitle.trim() !== '' ? formData.jobTitle : undefined,
      organization_name: formData.companyName,
      organization_tax_status: formData.companyTaxStatus
    }).then(() => history.push('/'));
  };

  const formSubmitErrors = errors?.length && 'An Error Occurred';

  return (
    <S.Modal open={open} aria-labelledby="profile-modal-title" data-testid="finalize-profile-modal">
      <S.Profile>
        <S.h1 id="profile-modal-title">Let's Customize Your Account</S.h1>
        <S.Description>Help us create your personalized experience!</S.Description>
        <ProfileForm onProfileSubmit={onProfileSubmit} disabled={profileCustomizationIsLoading} />
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
