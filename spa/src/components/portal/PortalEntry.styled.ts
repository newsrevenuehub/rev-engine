import styled from 'styled-components';
import { Button as BaseButton } from 'components/base';

export const Wrapper = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  background: #f9f9f9;
`;

export const Button = styled(BaseButton)<{ $renderCustomStyles: boolean }>`
  ${(props) =>
    props.$renderCustomStyles &&
    `
  && {
    background-color: ${props.theme.colors.cstm_CTAs};

    &.Mui-disabled {
      background-color: ${props.theme.colors.cstm_CTAs};
      opacity: 0.4;
    }

    &:active,
    &:hover {
      background-color: ${props.theme.colors.cstm_CTAs};
      opacity: 0.8;
    }
  }
  `}
`;

export const Content = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 4rem;
  padding: 2rem;
  max-width: 693px;
  box-sizing: content-box;
`;

export const Title = styled.h1`
  text-align: center;
  font-family: ${(props) => props.theme.systemFont};
  font-weight: 600;
  font-size: ${(props) => props.theme.fontSizesUpdated.h1};
  color: ${(props) => props.theme.basePalette.primary.indigo};
`;

export const Subtitle = styled.p`
  text-align: center;
  font-family: ${(props) => props.theme.systemFont};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  color: ${(props) => props.theme.basePalette.greyscale['70']};
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 440px;
  gap: 40px;
`;

export const Confirmation = styled.div`
  max-width: 633px;
  box-shadow: 0px 0px 4px 0px rgba(0, 0, 0, 0.2);
  border-radius: ${(props) => props.theme.muiBorderRadius.xl};
  border: 0.5px solid ${(props) => props.theme.basePalette.greyscale['30']};
  background-color: ${(props) => props.theme.basePalette.greyscale.white};
  padding: 22px 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  h2 {
    font-size: ${(props) => props.theme.fontSizesUpdated.lg};
    font-family: ${(props) => props.theme.systemFont};
    font-weight: 600;
    margin: 0;
  }

  p {
    margin: 0;
    font-family: ${(props) => props.theme.systemFont};
    font-weight: 400;
    font-size: ${(props) => props.theme.fontSizesUpdated.md};
  }
`;
