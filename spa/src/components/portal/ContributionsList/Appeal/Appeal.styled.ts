import { Button } from 'components/base';
import styled from 'styled-components';

export const Wrapper = styled.div<{ $isInsideModal: boolean }>`
  position: relative;
  background-color: ${({ theme }) => theme.basePalette.greyscale.white};
  border-radius: 10px;
  border: 0.25px solid ${({ theme }) => theme.basePalette.greyscale.grey3};
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 23px;

  ${({ $isInsideModal }) =>
    $isInsideModal &&
    `
    border: none;
    padding: 35px 10px 10px;
  `}
`;

export const Image = styled.img`
  height: 235px;
  object-fit: cover;
`;

export const AppealButton = styled(Button)`
  && {
    height: unset;
    align-self: end;
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

export const TextWrapper = styled.div`
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const Title = styled.p`
  font-size: ${({ theme }) => theme.fontSizesUpdated.lgx};
  color: ${({ theme }) => theme.basePalette.primary.indigo};
  font-weight: 600;
  margin: 0;

  @media (max-width: 768px) {
    font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  }
`;

export const Description = styled.div`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font-weight: 400;
  line-height: 21px;
`;

export const MultipleArrowsIcon = styled.img<{ $isInsideModal: boolean }>`
  z-index: 1;
  position: absolute;
  top: 3px;

  ${({ $isInsideModal }) =>
    $isInsideModal &&
    `
    top: 18px;
  `}
`;
