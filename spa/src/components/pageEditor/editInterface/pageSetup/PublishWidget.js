import { useState, forwardRef, useEffect } from 'react';
import * as S from './PublishWidget.styled';
import { Label } from 'elements/inputs/BaseField.styled';

// Deps
import DatePicker from 'react-datepicker';
import { isAfter } from 'date-fns';

// Children
import Button from 'elements/buttons/Button';

function PublishWidget({ publishDate, onChange }) {
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
    // const pageOriginallyPublished = ogPublishDate && isBefore(new Date(ogPublishDate), new Date());
    // const newDateAfterNow = date && isAfter(new Date(date), new Date());
    // // If a page was previously published, but we're now setting it to a future date, warn.
    // if (pageOriginallyPublished && newDateAfterNow) {
    //   getUserConfirmation('This page is currently live. Unpublish this page?', () => onChange(date));
    // } else {
    //   onChange(date);
    // }
  };

  const handlePublishNow = () => {
    onChange(new Date());
  };

  return (
    <S.PublishWidget>
      <Label>Publication date</Label>
      <DatePicker
        selected={publishDate}
        onChange={handleChange}
        showTimeSelect
        dateFormat="MMM do, yyyy 'at' h:mm aa"
        customInput={<DatepickerInput />}
        startDate={new Date()}
      />
      {showPublishNow && (
        <S.PublishNow>
          <S.Or>- or -</S.Or>
          <Button type="positive" onClick={handlePublishNow}>
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
