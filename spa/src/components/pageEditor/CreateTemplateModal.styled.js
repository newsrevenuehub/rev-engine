import styled from 'styled-components';

export const CreateTemplateModal = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow-y: auto;
  background: ${(props) => props.theme.colors.paneBackground};
  border-radius: ${(props) => props.theme.radii[0]};
`;

export const ModalTitle = styled.h2`
  text-align: center;
  padding: 2rem 4rem 0;
`;

export const TemplateForm = styled.form``;

export const FormFields = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2rem 4rem;
`;

export const InputWrapper = styled.div`
  width: 300px;
  margin-bottom: 1.5rem;
`;

export const Buttons = styled.div`
  border-top: 1px solid ${(props) => props.theme.colors.grey[1]};
  height: 50px;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding-top: 1rem;
  margin-bottom: 2rem;

  & button:not(:last-child) {
    margin-right: 2rem;
  }
`;
