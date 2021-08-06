import { useState, forwardRef, useEffect } from 'react';
import * as S from './PublishWidget.styled';
import { Label } from 'elements/inputs/BaseField.styled';

// Deps
import DatePicker from 'react-datepicker';
import { isAfter } from 'date-fns';

// Children
import Button from 'elements/buttons/Button';
import FormErrors from 'elements/inputs/FormErrors';

function PublishWidget({ publishDate, onChange, errors }) {
  const [showPublishNow, setShowPublishNow] = useState(false);
  // TODO: Handle CLEAR published date

  useEffect(() => {
    // If published date is blank, or after now
    if (!publishDate || isAfter(new Date(publishDate), new Date())) {
      setShowPublishNow(true);
    } else {
      setShowPublishNow(false);
    }
  }, [publishDate]);

  const handleChange = (date) => {
    onChange(date);
  };

  const handlePublishNow = () => {
    onChange(new Date());
  };

  return (
    <S.PublishWidget data-testid="publish-widget">
      <Label>Publication date</Label>
      <DatePicker
        selected={publishDate}
        onChange={handleChange}
        showTimeSelect
        dateFormat="MMM do, yyyy 'at' h:mm aa"
        customInput={<DatepickerInput />}
        startDate={new Date()}
        data-testid="publish-date-input"
      />
      {errors && <FormErrors errors={errors} />}
      {showPublishNow && (
        <S.PublishNow>
          <S.Or>- or -</S.Or>
          <Button type="positive" onClick={handlePublishNow} data-testid="publish-now-button">
            Publish now
          </Button>
        </S.PublishNow>
      )}
    </S.PublishWidget>
  );
}

export default PublishWidget;

const DatepickerInput = forwardRef(({ value, onClick }, ref) => {
  return (
    <S.DatepickerInput className="example-custom-input" onClick={onClick} ref={ref}>
      {value ? value : <S.Placeholder>Select a date to publish this page</S.Placeholder>}
    </S.DatepickerInput>
  );
});
