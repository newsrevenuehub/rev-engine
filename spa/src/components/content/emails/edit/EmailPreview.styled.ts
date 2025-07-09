import styled from 'styled-components';

// Most values are not themed because we're matching styles set on the email
// template.

export const Details = styled.div`
  border: 1px solid #c4c4c4;
  border-radius: 10px;
  margin: 24px 0;
  padding: 20px 24px;
`;

export const Header = styled.div<{ $defaultLogo?: boolean }>`
  display: flex;
  height: 80px;
  ${(props) =>
    props.$defaultLogo
      ? `
      align-items: flex-start;
      justify-content: flex-start;`
      : `
      align-items: center;
      justify-content: center;`};
`;

export const BodyText = styled.p`
  font-size: 16px;
`;

export const FakeLink = styled.span`
  color: #15c;
`;

export const Footer = styled.div`
  text-align: center;
`;

export const Heading = styled.h4`
  font-size: 30px;
`;

export const Logo = styled.img`
  height: 50px;
  width: auto;
`;

export const RevenueProgramStatus = styled.p`
  padding: 0 20px;
`;

export const Root = styled.div`
  border: 1px solid ${({ theme }) => theme.basePalette.greyscale[70]};
  padding: 20px;
  width: 540px;
`;

export const Subheading = styled.h5`
  font-size: 18px;
`;
