import PropTypes from 'prop-types';
import { Description, Header, PageErrorWrapper, Wrapper } from './PageError.styled';

const PageErrorPropTypes = {
  header: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  description: PropTypes.node
};

export type PageErrorProps = PropTypes.InferProps<typeof PageErrorPropTypes>;

function PageError({ header, description = 'Something went wrong. Please try again later.' }: PageErrorProps) {
  return (
    <PageErrorWrapper data-testid="page-error">
      <Wrapper>
        {header && <Header>{header}</Header>}
        <Description>{description}</Description>
      </Wrapper>
    </PageErrorWrapper>
  );
}

PageError.propTypes = PageErrorPropTypes;

export default PageError;
