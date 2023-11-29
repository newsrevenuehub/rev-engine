import styled from 'styled-components';
import { Loader } from 'semantic-ui-react';

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
