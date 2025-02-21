import PropTypes, { InferProps } from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePage } from 'components/donationPage/DonationPage';
import { ReasonElement } from 'hooks/useContributionPage';
import DElement from '../DElement';
import TributeFields, { TributeFieldsProps } from './TributeFields';
import ReasonFields from './ReasonFields';

const DReasonPropTypes = {
  element: PropTypes.object.isRequired
};

export interface DReasonProps extends InferProps<typeof DReasonPropTypes> {
  element: ReasonElement;
}

export function DReason({ element }: DReasonProps) {
  const { errors } = usePage();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [reasonText, setReasonText] = useState<string>('');
  const [tributeType, setTributeType] = useState<TributeFieldsProps['tributeType']>(null);
  const [tributeName, setTributeName] = useState('');
  const { t } = useTranslation();
  const required = useMemo(() => element.requiredFields.includes('reason_for_giving'), [element.requiredFields]);
  const tributeError = useMemo(() => {
    switch (tributeType) {
      case 'honoree':
        return errors.honoree;
      case 'inMemoryOf':
        return errors.in_memory_of;
    }
  }, [errors.honoree, errors.in_memory_of, tributeType]);

  return (
    <DElement label={t('donationPage.dReason.reasonForGiving')} data-testid="d-reason">
      {element.content.askReason && (
        <ReasonFields
          error={errors.reason_for_giving}
          onChangeOption={setSelectedReason}
          onChangeText={setReasonText}
          options={element.content.reasons}
          required={required}
          selectedOption={selectedReason}
          text={reasonText}
        />
      )}
      {(element.content.askHonoree || element.content.askInMemoryOf) && (
        <TributeFields
          askHonoree={element.content.askHonoree}
          askInMemoryOf={element.content.askInMemoryOf}
          error={tributeError}
          onChangeTributeName={setTributeName}
          onChangeTributeType={setTributeType}
          tributeName={tributeName}
          tributeType={tributeType}
        />
      )}
    </DElement>
  );
}

DReason.propTypes = DReasonPropTypes;
DReason.type = 'DReason';
DReason.displayName = 'Reason for Giving';
DReason.description = "Collect information about the contributor's reason for giving";
DReason.required = false;
DReason.unique = true;
export default DReason;
