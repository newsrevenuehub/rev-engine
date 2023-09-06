import styled from 'styled-components';

export const Root = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Controls = styled.div`
  width: 90%;
  margin: 0 auto;
`;

export const MainContent = styled.div`
  display: flex;
`;

export const ImageSelectorWrapper = styled.div`
  width: 100%;
  margin: 2rem auto;
  padding-bottom: 2rem;

  border-bottom: 1px solid ${(props) => props.theme.colors.grey[0]};
`;

export const ImageSelectorHelpText = styled.div`
  font-style: italic;
  font-weight: 200;
  margin-top: 1rem;
`;

export const InputWrapper = styled.div`
  padding: 2rem 0;
  border-bottom: ${(props) => (props.border ? '1px solid' : 'none')};
  border-color: ${(props) => props.theme.colors.grey[0]};
`;

export const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 500;
`;
