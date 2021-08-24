import styled from 'styled-components';
import { baseInputStyles } from 'elements/inputs/BaseField.styled';

export const PublishWidget = styled.div`
  width: 100%;

  .react-datepicker-wrapper {
    display: block;
  }

  .react-datepicker__navigation-icon {
    width: 0;
  }

  padding: 2rem 0;
  border-bottom: 1px solid;
  border-color: ${(props) => props.theme.colors.grey[0]};
`;

export const DatepickerInput = styled.button`
  ${baseInputStyles};
  width: 100%;
  text-align: left;
`;

export const Placeholder = styled.p`
  font-weight: 200;
  color: ${(props) => props.theme.colors.grey[1]};
`;

export const PublishNow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const Or = styled.p`
  margin: 0;
  padding: 1rem;
`;
