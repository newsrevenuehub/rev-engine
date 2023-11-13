import styled from 'styled-components';
import { Loader } from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';

function Spinner() {
  return (
    <SpinnerWrapper>
      <Loader active />
    </SpinnerWrapper>
  );
}

const SpinnerWrapper = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
`;

export default Spinner;
