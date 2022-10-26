import { Add } from '@material-ui/icons';
import { Button, MenuItem, TextField } from 'components/base';
import { usePageEditorContext } from 'components/pageEditor/PageEditor';
import { useState } from 'react';
import AddStylesModal from './AddStylesModal';
import { NewContainer, Root } from './StylesChooser.styled';

export function StylesChooser() {
  const { page, availableStyles, setAvailableStyles } = usePageEditorContext();
  const [addOpen, setAddOpen] = useState(false);
  const [styles, setStyles] = useState(page.styles);

  return (
    <>
      <Root>
        <NewContainer>
          <Button color="link" onClick={() => setAddOpen(true)} size="small" startIcon={<Add />}>
            New Style
          </Button>
        </NewContainer>
        <TextField fullWidth label="Style" select value={styles.id}>
          {availableStyles.map((style: any) => (
            <MenuItem key={style.id} value={style.id}>
              {style.name}
            </MenuItem>
          ))}
        </TextField>
      </Root>
      <AddStylesModal closeModal={() => setAddOpen(false)} handleAddNewStyles={() => {}} isOpen={addOpen} />
    </>
  );
}
