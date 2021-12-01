import _ from 'lodash';
import { Redirect as RRRedirect } from 'react-router-dom';
import { extract, stringify, parse } from 'query-string';

const mergeQueryStrings = (...args) => {
  const queryString = stringify(
    _.transform(
      args,
      (result, value) => {
        _.assign(result, _.isString(value) ? parse(value) : value);
      },
      {}
    )
  );
  return queryString ? '?' + queryString : '';
};

const Redirect = ({ preserveQueryString, ...props }) => {
  if (_.isUndefined(preserveQueryString)) {
    preserveQueryString = _.has(props, 'from');
  }
  if (!preserveQueryString || !window.location.search) {
    return <RRRedirect {...props} />;
  }
  const { to, ...rest } = props;
  const toSearch = _.isString(to) ? extract(to) : _.get(to, 'search', '');
  const search = mergeQueryStrings(window.location.search, toSearch);
  const nextLocation = _.isString(to) ? { pathname: to.split('?')[0], search } : { ...to, search };
  console.log('nextLocation', nextLocation);
  console.log('rest', rest);
  return <RRRedirect to={nextLocation} {...rest} />;
};

export default Redirect;
