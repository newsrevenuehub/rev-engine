import styled from 'styled-components';

export const Flex = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  p {
    font-family: ${(props) => props.theme.systemFont};
  }

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    flex-direction: column;
  }
`;

export const Title = styled.p`
  font-size: ${(props) => props.theme.fontSizesUpdated[20]};
  color: ${(props) => props.theme.colors.white};
  font-weight: 500;
  margin: 0;
`;

export const OrgWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: 17px;

  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    width: unset;
  }
`;

export const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 33px;
  width: 33px;
  background-color: ${(props) => props.theme.colors.navOrgIcon};
  border: 1px solid ${(props) => props.theme.colors.white};
  border-radius: ${(props) => props.theme.muiBorderRadius.lg};

  && svg {
    fill: ${(props) => props.theme.colors.white};
    height: 24px;
    width: 24px;
  }
`;

export const Divider = styled.div`
  background: rgba(221, 203, 231, 0.2);
  margin-bottom: 16px;
  height: 1px;
`;
