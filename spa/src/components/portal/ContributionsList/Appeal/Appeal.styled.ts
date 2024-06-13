import { Button } from 'components/base';
import styled from 'styled-components';

export const Wrapper = styled.div<{ $slim: boolean; $inModal: boolean }>`
  background-color: ${({ theme }) => theme.basePalette.greyscale.white};
  border-radius: 10px;
  border: 0.25px solid ${({ theme }) => theme.basePalette.greyscale.grey3};
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 23px;

  & > img {
    height: 300px;
    object-fit: cover;
  }

  ${({ $inModal }) =>
    $inModal &&
    `
    border: none;
    padding: 35px 10px 10px;
  `}

  ${({ $slim }) =>
    $slim &&
    `
    flex-direction: row;
    padding: 17px 23px;

    && > img {
      height: 108px;
      min-width: 233px;
    }
  `}
`;

export const AppealButton = styled(Button)`
  && {
    padding: 0;
    height: unset;
    align-self: baseline;
    background: none;
    box-shadow: none;

    &:hover {
      background: none;
      box-shadow: none;
    }

    .NreButtonLabel {
      color: ${({ theme }) => theme.basePalette.primary.engineBlue};
    }
  }
`;

export const TextWrapper = styled.div<{ $slim: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;

  ${({ $slim }) =>
    $slim &&
    `
    gap: 12px;
  `}
`;

export const Title = styled.p<{ $slim: boolean }>`
  font-size: ${({ theme, $slim }) => ($slim ? theme.fontSizesUpdated.lg : theme.fontSizesUpdated.lgx)};
  font-weight: 600;
  margin: 0;

  @media (max-width: 768px) {
    font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  }
`;

export const Description = styled.p<{ $hideText: boolean }>`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 400;
  line-height: 21px;

  ${({ $hideText }) =>
    $hideText &&
    `
    text-overflow: ellipsis;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  `}
`;
