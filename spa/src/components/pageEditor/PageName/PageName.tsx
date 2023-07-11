import { Check, EditOutlined } from '@material-ui/icons';
import { ChangeEvent, FormEvent, KeyboardEvent, useRef, useState } from 'react';
import { ReactComponent as BookmarkIcon } from '@material-design-icons/svg/outlined/bookmark_border.svg';
import { IconButton, OffscreenText, Tooltip } from 'components/base';
import { useEditablePageContext } from 'hooks/useEditablePage';
import { Button, Label, TextField, InputAdornment, IconWrapper, Form } from './PageName.styled';
import { ClickAwayListener } from '@material-ui/core';

export function PageName() {
  const { setPageChanges, updatedPagePreview } = useEditablePageContext();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const fieldRef = useRef<HTMLDivElement>(null);

  const defaultDonationPage =
    updatedPagePreview && updatedPagePreview.id === updatedPagePreview?.revenue_program?.default_donation_page;
  console.log({ defaultDonationPage, updatedPagePreview });
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

  const Icon = () => (
    <IconWrapper>
      <BookmarkIcon data-testid="bookmark-icon" aria-label="Default Contribution Page" />
    </IconWrapper>
  );

  if (!updatedPagePreview) {
    return null;
  }

  if (editing) {
    return (
      <ClickAwayListener onClickAway={() => setEditing(false)}>
        <Form onSubmit={handleFinishEditing}>
          <TextField
            {...(defaultDonationPage && {
              InputProps: {
                classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' },
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon />
                  </InputAdornment>
                )
              },
              inputProps: {}
            })}
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
        </Form>
      </ClickAwayListener>
    );
  }

  return (
    <Tooltip title="Edit">
      <Button endIcon={<EditOutlined />} onClick={handleClick}>
        {defaultDonationPage && <Icon />}
        <Label>{updatedPagePreview?.name}</Label>
      </Button>
    </Tooltip>
  );
}

export default PageName;
