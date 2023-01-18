import styled from 'styled-components';

export const Flex = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 570px;
  width: 100%;
  height: 324px;
  border: 1px solid ${(props) => props.theme.colors.muiGrey[400]};
  border-radius: ${(props) => `calc(${props.theme.muiBorderRadius['2xl']} + 1px)`};
`;

export const Header = styled.div<{ $color: string }>`
  background-color: ${(props) => props.$color};
  width: 100%;
  height: 34px;
  border-top-left-radius: ${(props) => props.theme.muiBorderRadius['2xl']};
  border-top-right-radius: ${(props) => props.theme.muiBorderRadius['2xl']};
`;

export const Content = styled.div<{ $color: string }>`
  background-color: ${(props) => props.$color};
  padding: 16px 44px 0;
  width: 100%;
  flex-grow: 1;
  border-bottom-left-radius: ${(props) => props.theme.muiBorderRadius['2xl']};
  border-bottom-right-radius: ${(props) => props.theme.muiBorderRadius['2xl']};
  display: flex;
`;

export const Form = styled.div<{ $color: string }>`
  display: flex;
  gap: 22px;
  flex-direction: column;
  width: 100%;
  padding: 30px 28px 20px;
  background-color: ${(props) => props.$color};
  border-top-left-radius: ${(props) => props.theme.muiBorderRadius['2xl']};
  border-top-right-radius: ${(props) => props.theme.muiBorderRadius['2xl']};
`;

export const LineInput = styled.div<{ $color?: string | null; $border?: string | null }>`
  height: 27px;
  max-height: 27px;
  flex-grow: 1;
  background-color: ${(props) => props.$color ?? props.theme.colors.muiGrey[50]};
  border: 1px solid ${(props) => props.$border ?? props.theme.colors.muiGrey[400]};
  border-radius: ${(props) => props.theme.muiBorderRadius.xl};
`;

export const HalfLineInputWrapper = styled.div<{ $color?: string | null; $border?: string | null }>`
  display: flex;
  gap: 10px;
`;

export const AccentWrapper = styled.div`
  width: calc(50% - 5px);
  display: flex;
  flex-direction: column;
  gap: 13px;
`;

export const AccentLineWrapper = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;

  & > p {
    width: unset;
    flex-grow: 1;
  }
`;

export const Accent = styled.div<{ $color: string }>`
  height: 22px;
  width: 22px;
  border-radius: 50%;
  background-color: ${(props) => props.$color};
`;

export const Button = styled.div<{ $color: string }>`
  margin: 0 auto;
  height: 27px;
  width: 180px;
  background-color: ${(props) => props.$color};
`;
