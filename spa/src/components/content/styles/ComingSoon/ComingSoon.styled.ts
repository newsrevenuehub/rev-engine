import { ReactComponent as LightIcon } from 'assets/icons/recycle_light.svg';
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
  background-color: ${({ theme }) => theme.basePalette.greyscale.grey3};
  border-radius: ${({ theme }) => theme.muiBorderRadius.xl};
  padding: 30px;
  position: relative;
  margin-bottom: 40px;
`;

export const Text = styled.p`
  max-width: 494px;
  text-align: center;
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  margin-top: 10px;
  margin-bottom: 0;
`;

export const Icon = styled(LightIcon)`
  height: 24px;
  width: 24px;
`;

export const ButtonWrapper = styled.div`
  display: flex;
  gap: 26px;
  align-items: center;
`;
