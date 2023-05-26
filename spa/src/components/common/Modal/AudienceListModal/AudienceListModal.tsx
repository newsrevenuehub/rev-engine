import orderBy from 'lodash.orderby';
import PropTypes, { InferProps } from 'prop-types';
import { useMemo } from 'react';

import { Button, Modal, ModalContent, ModalFooter, ModalHeader, SearchableSelect } from 'components/base';
import { Audience, RevenueProgram } from 'hooks/useContributionPage';
import useRevenueProgram from 'hooks/useRevenueProgram';
import { Controller, useForm } from 'react-hook-form';
import { ErrorMessage, Highlight, InfoIcon, Label, Title, Typography } from './AudienceListModal.styled';

export interface AudienceListModalProps extends Omit<InferProps<typeof AudienceListModalPropTypes>, 'revenueProgram'> {
  revenueProgram: RevenueProgram;
}

const formDefaultValues = {
  // "." is to select the dropdown placeholder "Select Audience List"
  audience: { id: '.', name: 'Select your list' }
};

const AudienceListModal = ({ open, loading, outerError, revenueProgram }: AudienceListModalProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: formDefaultValues
  });
  const { updateRevenueProgram, isLoading } = useRevenueProgram(revenueProgram.id);

  const onSubmit = (form: typeof formDefaultValues) => {
    updateRevenueProgram({
      mailchimp_list_id: form.audience.id
    });
  };

  const errorMessage = outerError || errors?.audience?.message;

  const sortedAudienceList = useMemo(
    () => orderBy(revenueProgram?.mailchimp_email_lists, 'name'),
    [revenueProgram?.mailchimp_email_lists]
  );

  // Adding a "." to the beginning of the array to select the placeholder
  const options = [{ id: '.', name: 'Select your list' }, ...sortedAudienceList];

  return (
    <Modal
      open={open}
      width={660}
      aria-labelledby="modal-page-header"
      PaperProps={{ component: 'form' }}
      onSubmit={handleSubmit(onSubmit)}
      data-testid="select-audience-modal"
    >
      <ModalHeader icon={<InfoIcon />}>
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
            validate: {
              defaultValue: (option) => option?.id !== '.' || 'Please select an Audience'
            }
          }}
          render={({ field: { ref, onChange, ...rest } }) => (
            <SearchableSelect
              {...rest}
              innerRef={ref}
              label={
                <Label>
                  <Highlight>*</Highlight>Audience
                </Label>
              }
              // Disable the placeholder
              getOptionDisabled={({ id }) => id === '.'}
              getOptionLabel={({ name }: Audience) => name}
              getOptionSelected={(option, value) => option.id === value.id}
              options={options}
              onChange={(_, data) => {
                onChange(data);
              }}
            />
          )}
        />
        {errorMessage && !loading && (
          <ErrorMessage role="error" data-testid="audience-error">
            {errorMessage}
          </ErrorMessage>
        )}
      </ModalContent>
      <ModalFooter>
        <Button color="information" disabled={loading || isLoading} type="submit" data-testid="select-audience-submit">
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
  revenueProgram: PropTypes.shape({
    id: PropTypes.number.isRequired,
    mailchimp_email_lists: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired
      }).isRequired
    ).isRequired
  }).isRequired
};

AudienceListModal.propTypes = AudienceListModalPropTypes;

export default AudienceListModal;
