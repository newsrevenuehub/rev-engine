import styled from 'styled-components';

export const InputWrapped = styled.div`
  border: 1.5px solid #c4c4c4;
  border-radius: 4px;
  display: flex;
  margin: 5px 0px;
  padding: 8px 6px 8px 12px;

  input {
    width: 97%;
  }

  &:focus-within {
    border: 1.5px solid #00bfdf;
  }
`;

export const Visibility = styled.img`
  height: 11px;
  width: 18px;
  margin-top: 3.6px;
`;

export const Label = styled.div`
  font-weight: 600;
  font-size: 13px;
  line-height: 16px;
  color: #323232;
  margin-top: 5px;
`;

export const ErrorMessage = styled.div`
  background: rgba(200, 32, 63, 0.16);
  border-radius: 2px;
  font-weight: 400;
  font-size: 11px;
  line-height: 13px;
  color: #3c3c3c;
  padding: 4px 9px;
`;

export const ErrorSpacer = styled.div`
  height: 17px;
  padding: 4px 9px;
`;

export const Instructions = styled.div`
  font-size: 11px;
  line-height: 13px;
  color: #3c3c3c;
  padding: 0px 0px 6px 0px;
`;
