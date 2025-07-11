import styled from 'styled-components';
import BaseSettingsSection from 'components/common/SettingsSection/SettingsSection';

export const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

export const BackButtonContainer = styled.div`
  margin-left: -16px;
  margin-top: -3rem;
  padding: 20px 0;
`;

export const Fields = styled.div`
  display: grid;
  gap: 25px;
  width: 300px;
`;

export const SettingsSection = styled(BaseSettingsSection)`
  max-width: 760px;
`;
