import PropTypes from 'prop-types';

import SvgIcon from 'assets/icons/SvgIcon';
import logo from 'assets/images/nre-logo-blue.svg';
import logo2 from 'assets/images/nre-logo-yellow.svg';

import {
  LeftbarWrapper,
  Logo,
  Heading,
  Divider,
  AdvantagesWrapper,
  Advantage,
  AdvContent,
  AdvHeading,
  AdvSubHeading
} from './Leftbar.styled';
import Content from './Content';

function Advantages() {
  return (
    <AdvantagesWrapper data-testid="advantages">
      {Content.advantages.map((advantage, key) => {
        return (
          <Advantage key={key}>
            <span>
              <SvgIcon icon={advantage.svg} />
            </span>
            <AdvContent>
              <AdvHeading>{advantage.heading}</AdvHeading>
              <AdvSubHeading dangerouslySetInnerHTML={{ __html: advantage.subheading }} />
            </AdvContent>
          </Advantage>
        );
      })}
    </AdvantagesWrapper>
  );
}

function Leftbar({ isCreateAccountPage }: { isCreateAccountPage?: boolean }) {
  return (
    <LeftbarWrapper isCreateAccountPage={isCreateAccountPage}>
      <Logo
        data-testid={isCreateAccountPage ? 'logo' : 'logo2'}
        src={isCreateAccountPage ? logo : logo2}
        alt="News Revenue Engine logo"
      />
      <Heading>{Content.heading}</Heading>
      <Divider isCreateAccountPage={isCreateAccountPage} />
      <Advantages />
    </LeftbarWrapper>
  );
}

Leftbar.propTypes = {
  isCreateAccountPage: PropTypes.bool
};

export default Leftbar;
