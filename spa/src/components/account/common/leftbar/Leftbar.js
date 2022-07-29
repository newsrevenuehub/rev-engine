import * as S from './Leftbar.styled';

import logo from 'assets/images/logo-nre.png';
import logoblue from 'assets/images/logo-nre-blue.png';
import Content from './Content.js';
import { ICONS } from 'assets/icons/SvgIcon';

function Heading() {
  return (
    <>
      <S.Heading>{Content.heading}</S.Heading>
    </>
  );
}

function Advantages() {
  return (
    <S.Advantages data-testid="advantages">
      {Content.advantages
        ? Content.advantages.map((advantage, key) => {
            return (
              <S.Advantage key={key}>
                <span>
                  <S.AdvantageIcon icon={ICONS[advantage.svg]} />
                </span>
                <S.AdvContent>
                  <S.AdvHeading>{advantage.heading}</S.AdvHeading>
                  <S.AdvSubHeading>{advantage.subheading}</S.AdvSubHeading>
                </S.AdvContent>
              </S.Advantage>
            );
          })
        : ''}
    </S.Advantages>
  );
}

function Leftbar({ page }) {
  if (page === 'create-account') {
    return (
      <S.LeftbarSignUp>
        <S.Logo data-testid={'blue-logo'} src={logo} />
        <Heading />
        <S.DividerSignUp />
        <Advantages />
      </S.LeftbarSignUp>
    );
  }

  return (
    <S.Leftbar>
      <S.Logo data-testid={'yellow-logo'} src={logoblue} />
      <Heading />
      <S.Divider />
      <Advantages />
    </S.Leftbar>
  );
}

export default Leftbar;
