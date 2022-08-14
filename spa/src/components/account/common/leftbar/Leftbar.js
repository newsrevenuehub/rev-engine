import * as S from './Leftbar.styled';

import logo from 'assets/images/nre-logo-blue.svg';
import logo2 from 'assets/images/nre-logo-yellow.svg';
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
      {Content.advantages.map((advantage, key) => {
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
      })}
    </S.Advantages>
  );
}

function Leftbar({ bgColor = '' }) {
  return (
    <S.Leftbar bgColor={bgColor}>
      <S.Logo data-testid={bgColor === 'purple' ? 'logo' : 'logo2'} src={bgColor === 'purple' ? logo : logo2} />
      <Heading />
      <S.Divider bgColor={bgColor} />
      <Advantages />
    </S.Leftbar>
  );
}

export default Leftbar;
