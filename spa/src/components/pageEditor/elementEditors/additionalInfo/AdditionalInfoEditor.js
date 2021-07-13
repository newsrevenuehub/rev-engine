import { useRef, useState } from 'react';
import * as S from './AdditionalInfoEditor.styled';

// Chooser
import AdditionalInfoChooser from './AdditionalInfoChooser';

// Context
import { useEditInterfaceContext } from 'components/pageEditor/editInterface/EditInterface';
import { usePageEditorContext } from '../../PageEditor';

function AdditionalInfoEditor(props) {
  const { elementContent, setElementContent } = useEditInterfaceContext();
  const { contributionMetadata } = usePageEditorContext();

  //Metadata State
  const [metadata, setMetadata] = useState(contributionMetadata);

  const handleRemoveItem = (item) => {
    const inputs = [...elementContent];
    const inputsWithout = inputs.filter((input) => input.name.toLowerCase() !== item.name.toLowerCase());
    setElementContent(inputsWithout);
  };

  const handleAddItem = (item) => {
    setElementContent([...(elementContent || []), createAdditionalInput({ item })]);
    const new_meta = [...metadata].filter((e) => e.key !== item.key);
    setMetadata(new_meta);
  };
  console.log(metadata);
  return (
    <S.AdditionalInfoEditor>
      <S.Description>Collect arbitrary data from your users by adding form fields to your page.</S.Description>
      <S.CurrentInputs>
        {elementContent?.map((existingInput) => (
          <S.CurrentInput key={existingInput.key}>
            <S.CurrentLabel>{existingInput.label}</S.CurrentLabel>
            <S.XButton onClick={() => handleRemoveItem(existingInput)} />
          </S.CurrentInput>
        ))}
      </S.CurrentInputs>
      <AdditionalInfoChooser metadata={metadata} existingElements={elementContent} setSelected={handleAddItem} />
    </S.AdditionalInfoEditor>
  );
}

AdditionalInfoEditor.for = 'DAdditionalInfo';

export default AdditionalInfoEditor;

AdditionalInfoEditor.hasErrors = function (content) {
  if (!content || content.length === 0) {
    return "Can't add an 'additional information' section without any inputs";
  }
  return false;
};

/**
 * Creates an input in the format expected by the donation page.
 * For now, we only support type "text".
 */
function createAdditionalInput({ item }) {
  return {
    name: item.key,
    label: item.label,
    type: item.metadata_type,
    additional_help_text: item.additional_help_text
  };
}
