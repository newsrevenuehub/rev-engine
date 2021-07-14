import styled from 'styled-components';
import MaterialSlider from '@material-ui/core/Slider';

export const AmountFilter = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 2rem;
`;

export const Slider = styled(MaterialSlider)`
  && {
    width: 300px;
    margin-left: 2rem;
    color: ${(props) => props.theme.colors.primary};
  }

  .MuiSlider-valueLabel {
    width: 100px;
  }
`;
