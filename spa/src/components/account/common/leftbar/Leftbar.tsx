import PropTypes, { InferProps } from 'prop-types';

import SvgIcon from 'assets/icons/SvgIcon';
import logo from 'assets/images/nre-logo-blue.svg';
import logo2 from 'assets/images/nre-logo-yellow.svg';

import Content from './Content';
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

export type LeftbarProps = InferProps<typeof LeftbarPropTypes>;

function Leftbar({ isCreateAccountPage }: LeftbarProps) {
  return (
    <LeftbarWrapper isCreateAccountPage={isCreateAccountPage}>
      <Logo
        data-testid={isCreateAccountPage ? 'logo' : 'logo2'}
        src={isCreateAccountPage ? logo : logo2}
        alt="News Revenue Engine"
      />
      <Heading>{Content.heading}</Heading>
      <Divider isCreateAccountPage={isCreateAccountPage} />
      <AdvantagesWrapper>
        {Content.advantages.map((advantage) => {
          return (
            <Advantage key={advantage.heading}>
              <span>
                <SvgIcon icon={advantage.svg} />
              </span>
              <AdvContent>
                <AdvHeading>{advantage.heading}</AdvHeading>
                <AdvSubHeading>{advantage.subheading}</AdvSubHeading>
              </AdvContent>
            </Advantage>
          );
        })}
      </AdvantagesWrapper>
    </LeftbarWrapper>
  );
}

const LeftbarPropTypes = {
  isCreateAccountPage: PropTypes.bool
};

Leftbar.propTypes = LeftbarPropTypes;

export default Leftbar;
