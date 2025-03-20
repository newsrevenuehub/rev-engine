import KeyIcon from '@material-design-icons/svg/outlined/vpn_key.svg?react';
import { LinkButton } from 'components/base';
import styled from 'styled-components';

export const Header = styled.h2`
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 500;
  margin: 0;
`;

export const Button = styled(LinkButton)`
  && {
    padding: 10px 16px;
    height: 40px;

    & .NreButtonLabel {
      color: ${({ theme }) => theme.basePalette.greyscale.black};
    }
  }
`;

export const Root = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 30px;
  width: 100%;
  background: linear-gradient(330deg, #62ffe3 0%, #ecff59 100%);
  border-radius: ${({ theme }) => theme.muiBorderRadius.xl};
  padding: 15px 30px 15px 50px;
  position: relative;
  margin-bottom: 40px;
`;

export const Text = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  margin-top: 10px;
  margin-bottom: 0;
`;

export const Icon = styled(KeyIcon)`
  height: 24px;
  left: 15px;
  position: absolute;
  top: 13px;
  width: 24px;
`;

export const ButtonWrapper = styled.div`
  display: flex;
  gap: 26px;
  align-items: center;
`;
