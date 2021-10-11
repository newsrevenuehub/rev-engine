import styled from 'styled-components';
import MaterialCheckbox from '@material-ui/core/Checkbox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { baseInputStyles, HelpText as BaseHelpText } from 'elements/inputs/BaseField.styled';
import Input from 'elements/inputs/Input';
import lighten from 'styles/utils/lighten';

export const SwagEditor = styled.div`
  display: flex;
  flex-direction: column;
  margin: 2rem 3rem 2rem 6rem;
`;

export const OptOutDefault = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-bottom: 2rem;
`;

export const Checkbox = styled(MaterialCheckbox)``;

export const CheckboxLabel = styled.label`
  font-size: 12px;
  font-style: italic;
`;

export const SwagThreshold = styled.div`
  padding: 2rem 0;
  margin: 0;
  border-top: 1px solid ${(props) => props.theme.colors.grey[1]};
`;

export const InputContainer = styled.div`
  ${baseInputStyles};
  width: 150px;
  display: flex;
  flex-direction: row;
  align-items: center;
  color: ${(props) => props.theme.colors.grey[2]};
`;

export const ThresholdInput = styled.input`
  border: none;
  flex: 1;
  width: 0px;
  color: ${(props) => props.theme.colors.black};
  padding: 0.5rem;
`;

export const Swags = styled.ul`
  list-style: none;
  padding: 2rem 0;
  margin: 0;
  border-top: 1px solid ${(props) => props.theme.colors.grey[1]};
`;

export const Swag = styled.li`
  margin-bottom: 1rem;
  border: 2px solid ${(props) => props.theme.colors.grey[2]};
  padding: 1rem;

  opacity: ${(props) => (props.isBeingEdited ? 0.3 : 1)};
`;

export const NoSwags = styled.p`
  font-style: italic;
  padding: 2rem 0;
`;

export const SwagName = styled.p`
  font-weight: bold;
`;

export const ExistingSwagButtons = styled.div`
  display: flex;
  flex-direction: row;
`;

export const EditButton = styled.button`
  cursor: pointer;
  border: none;
  background: transparent;
`;

export const EditIcon = styled(FontAwesomeIcon)`
  transform: translateY(-50%);
  color: ${(props) => props.theme.colors.success};

  transition: all 0.2s ease-in-out;

  &:hover {
    opacity: 0.7;
  }
`;

export const DeleteButton = styled.button`
  cursor: pointer;
  border: none;
  background: transparent;
`;

export const TrashIcon = styled(FontAwesomeIcon)`
  transform: translateY(-50%);
  color: ${(props) => props.theme.colors.caution};

  transition: all 0.2s ease-in-out;

  &:hover {
    opacity: 0.7;
  }
`;

export const SwagOptionsDescription = styled.p`
  margin-top: 2rem;
`;

export const SwagOptions = styled.ul`
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

export const SwagOption = styled.li`
  font-size: 14px;
  margin: 0.5rem;

  padding: 0.5rem;
  height: auto;
  max-width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  border-radius: 6px;
  background: ${(props) =>
    props.isDefault ? lighten(props.theme.colors.primary, 30) : props.theme.colors.fieldBackground};
  /* margin: 1rem; */
  color: ${(props) => props.theme.colors.grey[3]};

  & button {
    margin-left: 0.5rem;
  }
`;

export const AddSwag = styled.div`
  /* border-top: 1px solid ${(props) => props.theme.colors.grey[1]}; */
  padding: 2rem 0;
  margin-bottom: 2rem;
`;

export const AddSwagWrapper = styled.div`
  margin-bottom: 1rem;
  border: 2px solid ${(props) => props.theme.colors.grey[2]};
  padding: 1rem;
`;

export const SwagNameWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

export const SwagNameInput = styled(Input)``;

export const AddSwagOptions = styled.ul`
  margin: 0;
  padding: 0;
`;

export const OptionNameInput = styled.input`
  ${baseInputStyles};
  padding: 0.5rem;
  height: auto;
  width: 100%;
  font-size: 14px;
  border-color: ${(props) => props.theme.colors.grey[0]};
`;

export const HelpText = styled(BaseHelpText)`
  padding: 0 0.5rem;
  color: ${(props) => props.theme.colors.grey[3]};
`;

export const AddSwagButtons = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 1rem;
  & button:not(:last-of-type) {
    margin-right: 2rem;
  }
`;
