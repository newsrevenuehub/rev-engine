import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const DonationDetail = styled(motion.div)``;

export const Loading = styled(motion.div)`
  height: 100px;
`;

export const DL = styled(motion.dl)`
  dt {
    font-size: 16px;
    font-weight: 200;
    margin-top: 2rem;
  }

  dd {
    margin: 0.5rem 0;
    margin-left: 0;
  }
`;

export const DataGroup = styled.div`
  margin: 2rem 0;
`;

export const DataGroupHeading = styled.h3`
  font-weight: normal;
`;

export const DataInner = styled.div`
  margin: 1rem;
`;

export const ManageFlagged = styled.div`
  margin-top: 2rem;
  display: flex;
  flex-direction: row;
  justify-content: space-around;

  button {
    width: 200px;
  }
`;

export const AcceptIcon = styled(FontAwesomeIcon)``;

export const RejectIcon = styled(FontAwesomeIcon)``;
