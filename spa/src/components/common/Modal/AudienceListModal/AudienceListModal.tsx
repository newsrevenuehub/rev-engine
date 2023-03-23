import orderBy from 'lodash.orderby';
import PropTypes, { InferProps } from 'prop-types';
import { useMemo } from 'react';

import { Button, MenuItem, Modal, ModalContent, ModalFooter, ModalHeader, TextField } from 'components/base';
import { Controller, useForm } from 'react-hook-form';
import { ErrorMessage, Highlight, InfoIcon, Label, MenuItemLabel, Title, Typography } from './AudienceListModal.styled';

export interface AudienceListModalProps extends InferProps<typeof AudienceListModalPropTypes> {
  onSelectAudience: (audienceId: number) => void;
  onClose: () => void;
}

const formDefaultValues = {
  // "." is to select the dropdown placeholder "Select Audience List"
  audience: '.'
};

const AudienceListModal = ({
  open,
  onClose,
  loading,
  audienceList,
  onSelectAudience,
  outerError
}: AudienceListModalProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: formDefaultValues
  });

  const onSubmit = (form: typeof formDefaultValues) => {
    onSelectAudience(parseInt(form.audience));
  };

  const errorMessage = outerError || errors?.audience?.message;

  const sortedAudienceList = useMemo(() => orderBy(audienceList, 'name'), [audienceList]);

  return (
    <Modal
      open={open}
      width={480}
      onClose={onClose}
      aria-labelledby="modal-page-header"
      PaperProps={{ component: 'form' }}
      onSubmit={handleSubmit(onSubmit)}
      data-testid="select-audience-modal"
    >
      <ModalHeader icon={<InfoIcon />} onClose={onClose}>
        <Title id="modal-page-header">Finish Connection</Title>
      </ModalHeader>
      <ModalContent>
        <Typography>
          You’ve successfully connected to Mailchimp. Select from your Mailchimp audience below to continue and we’ll do
          the rest!
        </Typography>
        <Controller
          name="audience"
          control={control}
          rules={{
            required: 'Please select an Audience',
            pattern: {
              value: /.*[a-zA-Z].*/gm,
              message: 'Please select an Audience'
            }
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              id="audience"
              label={
                <Label>
                  <Highlight>*</Highlight>Audience
                </Label>
              }
              select
              data-testid="select-audience"
            >
              <MenuItem value="." disabled data-testid="select-audience-placeholder">
                <MenuItemLabel>Select your list</MenuItemLabel>
              </MenuItem>
              {sortedAudienceList.map((audience, index) => (
                <MenuItem key={audience.name} value={audience.id} data-testid={`select-revenue-program-${index}`}>
                  {audience.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        {errorMessage && !loading && (
          <ErrorMessage role="error" data-testid="audience-error">
            {errorMessage}
          </ErrorMessage>
        )}
      </ModalContent>
      <ModalFooter>
        <Button color="information" disabled={loading!} type="submit" data-testid="select-audience-submit">
          Finish
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const AudienceListModalPropTypes = {
  open: PropTypes.bool.isRequired,
  loading: PropTypes.bool,
  outerError: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSelectAudience: PropTypes.func.isRequired,
  audienceList: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired
  ).isRequired
};

AudienceListModal.propTypes = AudienceListModalPropTypes;

export default AudienceListModal;
