import { useMemo } from 'react';
import AddIcon from '@material-ui/icons/Add';
import orderBy from 'lodash.orderby';
import PropTypes, { InferProps } from 'prop-types';

import { Button, MenuItem, Modal, ModalContent, ModalFooter, ModalHeader, TextField } from 'components/base';
import { Controller, useForm } from 'react-hook-form';
import { ErrorMessage, Typography } from './AddPageModal.styled';

interface AddPageModalType extends InferProps<typeof AddPageModalPropTypes> {
  onClick: (revenueProgram: string) => void;
  onClose: () => void;
}

const formDefaultValues = {
  revenueProgram: ''
};

const AddPageModal = ({ open, onClose, loading, revenuePrograms, onClick, outerError }: AddPageModalType) => {
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: formDefaultValues
  });

  const onSubmit = (form: typeof formDefaultValues) => {
    onClick(form.revenueProgram);
  };

  const errorMessage = outerError || errors?.revenueProgram?.message;

  const sortedRP = useMemo(() => orderBy(revenuePrograms, 'name'), [revenuePrograms]);

  return (
    <Modal
      open={open}
      width={480}
      onClose={onClose}
      aria-label="Create new page"
      component="form"
      onSubmit={handleSubmit(onSubmit)}
    >
      <ModalHeader icon={<AddIcon />} onClose={onClose}>
        <strong>New Page</strong>
      </ModalHeader>
      <ModalContent>
        <Typography>Select the Revenue Program for this new page.</Typography>
        <Controller
          name="revenueProgram"
          control={control}
          rules={{ required: 'Please select a Revenue Program' }}
          render={({ field }) => (
            <TextField fullWidth id="revenue-program" label="Revenue Program" {...field} select>
              {sortedRP.map((revenueProgram) => (
                <MenuItem key={revenueProgram.name} value={revenueProgram.id}>
                  {revenueProgram.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        {errorMessage && !loading && (
          <ErrorMessage role="error" data-testid="email-error">
            {errorMessage}
          </ErrorMessage>
        )}
      </ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button color="primaryDark" disabled={loading!} type="submit">
          Create
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const AddPageModalPropTypes = {
  open: PropTypes.bool.isRequired,
  loading: PropTypes.bool,
  outerError: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  revenuePrograms: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired
  ).isRequired
};

AddPageModal.propTypes = AddPageModalPropTypes;

AddPageModal.defaultProps = {
  disabled: false
};

export default AddPageModal;
