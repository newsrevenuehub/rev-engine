import styled from 'styled-components';

export const Root = styled.div`
  margin-top: 3rem;
  margin-bottom: 2rem;
`;

export const SocialShareList = styled.ul`
  display: flex;
  flex-direction: row;
  list-style: none;
  gap: 1rem;
  margin: 0;
  padding: 0;
  margin-top: 2rem;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    flex-direction: column;
  }
`;

export const SocialShareItem = styled.li`
  svg {
    color: ${({ theme }) => theme.colors.muiGrey[500]};
    margin-right: 0.5rem;
    width: 30px;
  }
`;

export const SocialShareLink = styled.a`
  font-family: ${(props) => props.theme.systemFont};
  background: none;
  border: none;
  display: flex;
  flex-direction: row;
  align-items: center;
  color: ${(props) => props.theme.colors.black};
  transition: all 0.1s ease-in-out;
  padding: 0.5rem 1rem;

  &:hover {
    box-shadow: ${(props) => props.theme.shadows[1]};
    color: ${(props) => props.theme.colors.black};
  }

  &:active {
    box-shadow: ${(props) => props.theme.shadows[0]};
    color: ${(props) => props.theme.colors.black};
  }
`;

export const Text = styled.p`
  font-family: ${(props) => props.theme.systemFont};
`;

export const SocialImg = styled.img`
  height: 30px;
  width: auto;
  margin-right: 0.5rem;
`;
