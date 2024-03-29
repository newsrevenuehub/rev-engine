import styled from 'styled-components';
import SvgIcon from 'assets/icons/SvgIcon';

export const DPayment = styled.div``;

export const StyledNotLivePlaceholder = styled.div`
  font-family: ${(props) => props.theme.systemFont};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export const NotLiveIcon = styled(SvgIcon)`
  height: 35px;
  width: auto;
`;
