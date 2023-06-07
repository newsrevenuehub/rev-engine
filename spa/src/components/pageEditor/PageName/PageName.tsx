import { Check, EditOutlined } from '@material-ui/icons';
import { ChangeEvent, FormEvent, KeyboardEvent, useRef, useState } from 'react';
import { IconButton, OffscreenText, Tooltip } from 'components/base';
import { useEditablePageContext } from 'hooks/useEditablePage';
import { Button, Label, TextField } from './PageName.styled';
import { ClickAwayListener } from '@material-ui/core';

export function PageName() {
  const { setPageChanges, updatedPagePreview } = useEditablePageContext();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const fieldRef = useRef<HTMLDivElement>(null);

  function handleFinishEditing(event?: FormEvent) {
    if (editValue.trim() !== '' && editValue !== updatedPagePreview?.name) {
      setPageChanges((changes) => ({ ...changes, name: editValue }));
    }

    setEditing(false);

    if (event) {
      event.preventDefault();
    }
  }

  function handleClick() {
    setEditValue(updatedPagePreview?.name ?? '');
    setEditing(true);

    // In the next render when the field is visible, select its contents.

    window.setTimeout(() => {
      const input = fieldRef.current?.querySelector('input');

      if (input) {
        input.select();
      }
    }, 0);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    // Trim the text to the maximum allowed length for the page name.

    setEditValue(event.target.value.substring(0, 255));
  }

  function handleKeyUp(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      setEditing(false);
      event.preventDefault();
    }
  }

  if (!updatedPagePreview) {
    return null;
  }

  if (editing) {
    return (
      <ClickAwayListener onClickAway={() => setEditing(false)}>
        <form onSubmit={handleFinishEditing}>
          <TextField
            autoFocus
            id="page-name"
            label={<OffscreenText>Page Name</OffscreenText>}
            onChange={handleChange}
            onKeyUp={handleKeyUp}
            ref={fieldRef}
            value={editValue}
          />
          <IconButton aria-label="Save" color="primaryDark" type="submit">
            <Check />
          </IconButton>
        </form>
      </ClickAwayListener>
    );
  }

  return (
    <Tooltip title="Edit">
      <Button endIcon={<EditOutlined />} onClick={handleClick}>
        <Label>{updatedPagePreview?.name}</Label>
      </Button>
    </Tooltip>
  );
}

export default PageName;
