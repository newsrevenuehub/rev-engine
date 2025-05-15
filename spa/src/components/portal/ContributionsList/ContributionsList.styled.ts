import styled from 'styled-components';
import PortalPage from '../PortalPage';
import { Tabs as BaseTabs } from 'components/base';

export const List = styled.div<{ $detailVisible: boolean }>`
  align-self: self-start;
  display: grid;
  gap: 12px;
  grid-area: list;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    padding: 0 20px;
    ${(props) => props.$detailVisible && 'display: none;'}
  }
`;

export const AlignPositionWrapper = styled.div`
  grid-area: list;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    padding: 0 20px;
  }
`;

export const StyledPortalPage = styled(PortalPage)`
  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    background-color: ${({ theme }) => theme.basePalette.greyscale.white};
  }
`;

export const Root = styled.div`
  background-color: #f9f9f9;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    background-color: ${({ theme }) => theme.basePalette.greyscale.white};
  }
`;

export const Layout = styled.div`
  display: grid;
  gap: 25px 20px;
  grid-template-areas:
    'header _'
    /* TODO: DEV-4981 Enable Impact Tracker as soon as it's available */
    /* 'tracker _' */
    'legend _'
    'list detail';
  grid-template-columns: 1fr 1fr;
  margin: 0 auto;
  padding: 40px;
  position: relative;
  max-width: min(100vw, 1600px);

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    display: block;
    padding: 20px 0;
  }
`;

export const Detail = styled.div`
  grid-area: detail;
`;

export const Impact = styled.div`
  grid-area: tracker;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin-bottom: 40px;
    padding: 0 20px;
  }
`;

export const Legend = styled.div<{ $detailVisible: boolean }>`
  position: relative;
  grid-area: legend;

  @media (${(props) => props.theme.breakpoints.tabletLandscapeDown}) {
    margin-bottom: 40px;
    padding: 0 20px;
    ${(props) => props.$detailVisible && 'display: none;'}
  }
`;

export const Tabs = styled(BaseTabs)`
  margin-top: 20px;
  margin-bottom: 17px;
`;

export const Loading = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  grid-area: list;
`;

export const Subhead = styled.h2`
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
  line-height: 120%;
  margin-bottom: 12px;
`;

export const Description = styled.p`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  line-height: 120%;
`;

export const ContactInfoWrapper = styled.div`
  position: absolute;
  top: 0;
  right: 0;
`;
