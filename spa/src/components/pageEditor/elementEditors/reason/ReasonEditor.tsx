import { ChangeEvent } from 'react';
import { Checkbox, EditableList, FormControlLabel } from 'components/base';
import { ReasonElement } from 'hooks/useContributionPage';
import { ElementDetailEditorProps } from 'components/pageEditor/editInterface/ElementEditor.types';
import { ReasonPrompt, RequiredContainer, Root } from './ReasonEditor.styled';

/**
 * The DReason component that displays the element on an actual page expects
 * some structures to be present in element content.
 */
const defaultContent = {
  reasons: []
};

export type ReasonEditorProps = ElementDetailEditorProps<ReasonElement['content']>;

export function ReasonEditor({
  elementContent,
  elementRequiredFields,
  onChangeElementContent,
  onChangeElementRequiredFields
}: ReasonEditorProps) {
  function handleChangeCheckbox(fieldName: keyof ReasonElement['content'], event: ChangeEvent<HTMLInputElement>) {
    onChangeElementContent({ ...defaultContent, ...elementContent, [fieldName]: event.target.checked });
  }

  function handleChangeReasons(reasons: string[]) {
    onChangeElementContent({ ...defaultContent, ...elementContent, reasons });
  }

  function handleChangeRequiredCheckbox(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.checked) {
      onChangeElementRequiredFields(['reason_for_giving']);
    } else {
      onChangeElementRequiredFields([]);
    }
  }

  return (
    <Root data-testid="reason-editor">
      <FormControlLabel
        control={
          <Checkbox checked={elementContent.askReason} onChange={(event) => handleChangeCheckbox('askReason', event)} />
        }
        label="Ask contributor why they are making a contribution"
      />
      {elementContent.askReason && (
        <RequiredContainer>
          <FormControlLabel
            control={
              <Checkbox
                onChange={handleChangeRequiredCheckbox}
                value={elementRequiredFields.includes('reason_for_giving')}
              />
            }
            label="Should filling this out be required?"
          />
          <ReasonPrompt>Add a reason for giving below (optional)</ReasonPrompt>
          <EditableList
            id="reason-editor-list"
            onChange={handleChangeReasons}
            prompt="Add a Reason for Giving"
            value={elementContent.reasons ?? []}
          />
        </RequiredContainer>
      )}
      <FormControlLabel
        control={
          <Checkbox
            checked={elementContent.askHonoree}
            onChange={(event) => handleChangeCheckbox('askHonoree', event)}
          />
        }
        label="Ask contributor if their contribution is in honor of somebody"
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={elementContent.askInMemoryOf}
            onChange={(event) => handleChangeCheckbox('askInMemoryOf', event)}
          />
        }
        label="Ask contributor if their contribution is in memory of somebody"
      />
    </Root>
  );
}

export default ReasonEditor;
