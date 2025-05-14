import LightIcon from 'assets/icons/recycle-light.svg?react';
import { LinkButton } from 'components/base';
import styled from 'styled-components';

export const Header = styled.h2`
  color: ${({ theme }) => theme.basePalette.primary.purple};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 600;
  margin: 0;
  margin-top: -10px;
`;

export const LearnMoreButton = styled(LinkButton)`
  && {
    padding: 10px 16px;
    height: 40px;

    & .NreButtonLabel {
      color: ${({ theme }) => theme.basePalette.greyscale.black};
    }
  }
`;

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
  width: 100%;
  background-color: ${({ theme }) => theme.basePalette.greyscale['10']};
  border-radius: ${({ theme }) => theme.muiBorderRadius.xl};
  padding: 30px;
  position: relative;
  margin-bottom: 20px;
`;

export const Text = styled.p`
  max-width: 494px;
  text-align: center;
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  margin: 0;
`;

export const Icon = styled(LightIcon)`
  fill: ${({ theme }) => theme.basePalette.primary.purple};
`;

export const ButtonWrapper = styled.div`
  display: flex;
  gap: 26px;
  align-items: center;
`;
