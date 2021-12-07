import * as S from './DMarketing.styled';
import DElement from './DElement';

function DMarketing() {
  return (
    <DElement>
      <p>DMarketing</p>
    </DElement>
  );
}

DMarketing.type = 'DMarketing';
DMarketing.displayName = 'Marketing';
DMarketing.description = 'Ask donors to consent to marketing contact';
DMarketing.required = false;
DMarketing.unique = true;

export default DMarketing;
