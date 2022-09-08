import * as S from './Leftbar.styled';

import logo from 'assets/images/nre-logo-blue.svg';
import logo2 from 'assets/images/nre-logo-yellow.svg';
import Content from './Content.js';
import { ICONS } from 'assets/icons/SvgIcon';

import PropTypes from 'prop-types';

function Heading() {
  return <S.Heading>{Content.heading}</S.Heading>;
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
              <S.AdvSubHeading dangerouslySetInnerHTML={{ __html: advantage.subheading }} />
            </S.AdvContent>
          </S.Advantage>
        );
      })}
    </S.Advantages>
  );
}

function Leftbar({ isCreateAccountPage }) {
  return (
    <S.Leftbar isCreateAccountPage={isCreateAccountPage}>
      <S.Logo data-testid={isCreateAccountPage ? 'logo' : 'logo2'} src={isCreateAccountPage ? logo : logo2} />
      <Heading />
      <S.Divider isCreateAccountPage={isCreateAccountPage} />
      <Advantages />
    </S.Leftbar>
  );
}

Leftbar.propTypes = {
  isCreateAccountPage: PropTypes.bool
};

export default Leftbar;
