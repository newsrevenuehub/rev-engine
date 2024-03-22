import { DeleteOutline, EditOutlined, SaveOutlined, VisibilityOutlined } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { Button, Root } from './PageEditorToolbar.styled';
import { Tooltip } from 'components/base';

const PageEditorToolbarPropTypes = {
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  saveDisabled: PropTypes.bool,
  selected: PropTypes.any
};

export interface PageEditorToolbarProps extends InferProps<typeof PageEditorToolbarPropTypes> {
  onDelete: () => void;
  onEdit: () => void;
  onPreview: () => void;
  onSave: () => void;
  selected?: 'edit' | 'preview';
}

export function PageEditorToolbar({
  onDelete,
  onEdit,
  onPreview,
  onSave,
  saveDisabled,
  selected
}: PageEditorToolbarProps) {
  return (
    <Root>
      <Tooltip placement="right" title="View">
        <Button
          color="text"
          aria-label="View"
          aria-pressed={selected === 'preview'}
          onClick={onPreview}
          data-testid="preview-page-button"
        >
          <VisibilityOutlined />
        </Button>
      </Tooltip>
      <Tooltip placement="right" title="Edit">
        <Button
          color="text"
          aria-label="Edit"
          aria-pressed={selected === 'edit'}
          onClick={onEdit}
          data-testid="edit-page-button"
        >
          <EditOutlined />
        </Button>
      </Tooltip>
      <Tooltip placement="right" title="Save">
        <span>
          <Button
            color="text"
            aria-label="Save"
            disabled={!!saveDisabled}
            onClick={onSave}
            data-testid="save-page-button"
          >
            <SaveOutlined />
          </Button>
        </span>
      </Tooltip>
      <Tooltip placement="right" title="Delete">
        <Button color="text" aria-label="Delete" onClick={onDelete} data-testid="delete-page-button">
          <DeleteOutline />
        </Button>
      </Tooltip>
    </Root>
  );
}

PageEditorToolbar.propTypes = PageEditorToolbarPropTypes;
export default PageEditorToolbar;
