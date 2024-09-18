import PropTypes, { InferProps } from 'prop-types';
import { SectionEditButton } from '../common.styled';
import { EditControls } from './DetailSection.styled';

const DetailSectionEditControlsPropTypes = {
  disabled: PropTypes.bool,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export type DetailSectionEditControlsProps = InferProps<typeof DetailSectionEditControlsPropTypes>;

export function DetailSectionEditControls({ disabled = false, onSave, onCancel }: DetailSectionEditControlsProps) {
  return (
    <EditControls>
      <SectionEditButton color="text" onClick={onCancel}>
        Cancel
      </SectionEditButton>
      <SectionEditButton color="primaryDark" disabled={disabled!} onClick={onSave}>
        Save
      </SectionEditButton>
    </EditControls>
  );
}

DetailSectionEditControls.propTypes = DetailSectionEditControlsPropTypes;
export default DetailSectionEditControls;
