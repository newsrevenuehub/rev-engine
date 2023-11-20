import { useMemo } from 'react';
import AddIcon from '@material-ui/icons/Add';
import orderBy from 'lodash.orderby';
import PropTypes, { InferProps } from 'prop-types';

import { Button, MenuItem, Modal, ModalContent, ModalFooter, ModalHeader, TextField } from 'components/base';
import { Controller, useForm } from 'react-hook-form';
import { ErrorMessage, Typography, Title } from './AddPageModal.styled';

export interface AddPageModalProps extends InferProps<typeof AddPageModalPropTypes> {
  onAddPage: (revenueProgram: number) => void;
  onClose: () => void;
}

const formDefaultValues = {
  // Even though revenue program IDs are numbers, this needs to be a string
  // because it will be a field value.
  revenueProgram: ''
};

const AddPageModal = ({ open, onClose, loading, revenuePrograms, onAddPage, outerError }: AddPageModalProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: formDefaultValues
  });

  const onSubmit = (form: typeof formDefaultValues) => {
    onAddPage(parseInt(form.revenueProgram));
  };

  const errorMessage = outerError || errors?.revenueProgram?.message;

  const sortedRP = useMemo(() => orderBy(revenuePrograms, 'name'), [revenuePrograms]);

  return (
    <Modal
      open={open}
      width={480}
      onClose={onClose}
      aria-labelledby="modal-page-header"
      PaperProps={{ component: 'form' }}
      onSubmit={handleSubmit(onSubmit)}
      data-testid="page-create-modal"
    >
      <ModalHeader icon={<AddIcon />} onClose={onClose}>
        <Title id="modal-page-header">New Page</Title>
      </ModalHeader>
      <ModalContent>
        <Typography>Select the Revenue Program for this new page.</Typography>
        <Controller
          name="revenueProgram"
          control={control}
          rules={{ required: 'Please select a Revenue Program' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              id="revenue-program"
              label="Revenue Program"
              select
              data-testid="new-page-revenue-program"
            >
              {sortedRP.map((revenueProgram, index) => (
                <MenuItem
                  key={revenueProgram.name}
                  value={revenueProgram.id}
                  data-testid={`select-revenue-program-${index}`}
                >
                  {revenueProgram.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        {errorMessage && !loading && (
          <ErrorMessage role="alert" data-testid="email-error">
            {errorMessage}
          </ErrorMessage>
        )}
      </ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button color="primaryDark" disabled={loading!} type="submit" data-testid="new-page-submit">
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
  onAddPage: PropTypes.func.isRequired,
  revenuePrograms: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired
  ).isRequired
};

AddPageModal.propTypes = AddPageModalPropTypes;

AddPageModal.defaultProps = {
  disabled: false
};

export default AddPageModal;
