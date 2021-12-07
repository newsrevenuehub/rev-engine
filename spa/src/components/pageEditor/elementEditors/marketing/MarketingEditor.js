import * as S from './MarketingEditor.styled';

// Components
import EditableInput, { useEditableInput } from 'components/pageEditor/elementEditors/editorGenerics/EditableInput';

function MarketingEditor() {
  const [marketingConsentField, setMarketingConsentField] = useEditableInput();

  return (
    <S.MarketingEditor>
      <EditableInput
        name="Marketing consent"
        description="Ask your donors to consent to marketing contact"
        field={marketingConsentField}
        setField={setMarketingConsentField}
        // {...marketingInputProps}
      />
    </S.MarketingEditor>
  );
}

export default MarketingEditor;

MarketingEditor.for = 'DMarketing';
