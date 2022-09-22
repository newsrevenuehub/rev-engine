import PropTypes from 'prop-types';

function ConditionalWrapper({ shouldWrap, wrapper, children }) {
  return shouldWrap ? wrapper(children) : children;
}

ConditionalWrapper.propTypes = {
  shouldWrap: PropTypes.bool.isRequired,
  wrapper: PropTypes.elementType.isRequired,
  children: PropTypes.node.isRequired
};

export default ConditionalWrapper;
