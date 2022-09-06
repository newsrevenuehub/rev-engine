import Tooltip from '@material-ui/core/Tooltip';
import { withStyles } from '@material-ui/core/styles';

const RETooltip = withStyles({
  tooltip: {
    color: '#fff',
    backgroundColor: '#323232',
    marginTop: '4px',
    padding: '4px 6px',
    fontSize: '11px',
    borderRadius: '0.5px'
  }
})(Tooltip);

export default RETooltip;
