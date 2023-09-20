import styled from 'styled-components';

export const Wrapper = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding-bottom: 50px;
  background: ${(props) => props.theme.colors.cstm_mainBackground};
`;

export const Content = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 4rem;
  padding: 2rem;
  max-width: 693px;
`;

export const Title = styled.h1`
  text-align: center;
  font-family: ${(props) => props.theme.font.heading};
  font-weight: 600;
  font-size: ${(props) => props.theme.fontSizesUpdated.h1};
  color: ${(props) => props.theme.basePalette.primary.indigo};
`;

export const Subtitle = styled.p`
  text-align: center;
  font-family: ${(props) => props.theme.font.body};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.lg};
  color: ${(props) => props.theme.basePalette.greyscale.grey1};
`;

export const PoweredBy = styled.div`
  width: 100%;
  gap: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${(props) => props.theme.font.body};
  font-weight: 400;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  color: ${(props) => props.theme.basePalette.greyscale.black};
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 440px;
  gap: 40px;
`;

export const Confirmation = styled.div`
  margin-top: 4rem;
  p {
    max-width: 400px;
    margin: 1rem auto;
    font-family: ${(props) => props.theme.systemFont};
  }
`;
