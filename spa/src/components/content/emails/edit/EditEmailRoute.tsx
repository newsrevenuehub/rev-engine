import { ClickAwayListener } from '@material-ui/core';
import { ArrowBackOutlined, SaveOutlined } from '@material-ui/icons';
import { Editor } from '@tiptap/react';
import { useSnackbar } from 'notistack';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, RouterLinkButton, TextField } from 'components/base';
import HeaderSection from 'components/common/HeaderSection';
import { Sections } from 'components/common/HeaderSection/HeaderSection.styled';
import SettingsSection from 'components/common/SettingsSection';
import EditorToolbar from 'components/content/emails/edit/EditorToolbar';
import SystemNotification from 'components/common/SystemNotification';
import { EmailCustomization, EmailCustomizationChanges, useEmailCustomizations } from 'hooks/useEmailCustomizations';
import useUser from 'hooks/useUser';
import { EMAILS_SLUG } from 'routes';
import EditorBlock from './EditorBlock';
import EmailPreview from './EmailPreview';
import ResetContentButton from './ResetContentButton';
import { defaultEmailContent } from './defaultContent';
import { Actions, BackButtonContainer, Fields } from './EditEmailRoute.styled';

const HEADER_LABELS: Record<EmailCustomization['email_type'], string> = {
  contribution_receipt: 'Receipts'
};

export function EditEmailRoute() {
  const { emailType } = useParams<{ emailType: EmailCustomization['email_type'] }>();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useUser();
  const [focusedBlock, setFocusedBlock] = useState<EmailCustomization['email_block']>();
  const [focusedEditor, setFocusedEditor] = useState<Editor>();
  const { customizations, upsertCustomizations } = useEmailCustomizations(emailType);
  const [customizationEdits, setCustomizationEdits] = useState<EmailCustomizationChanges>({});
  const revenueProgram = user?.revenue_programs[0];
  const editsPending = useMemo(() => {
    if (!revenueProgram) {
      return false;
    }

    return Object.entries(customizationEdits).some(([key, value]) => {
      const emailBlock = key as EmailCustomization['email_block'];

      return (
        value !==
        (customizations?.[emailBlock]
          ? customizations[emailBlock]?.content_html
          : defaultEmailContent(emailType, emailBlock, revenueProgram))
      );
    });
  }, [customizationEdits, customizations, emailType, revenueProgram]);

  function handleEditorBlur() {
    setFocusedBlock(undefined);
    setFocusedEditor(undefined);
  }

  function handleEditorFocus(editor: Editor, block: EmailCustomization['email_block']) {
    setFocusedEditor(editor);
    setFocusedBlock(block);
  }

  function handleEditorChange(value: string) {
    setCustomizationEdits((existing) => ({ ...existing, [focusedBlock as string]: value }));
  }

  async function handleSave() {
    // Neither of these two checks should ever be true. The save button will be
    // disabled if revenueProgram is undefined, and edits can't be made until
    // customizations have loaded, and upsertCustomizations is only set once
    // they have.

    if (!revenueProgram) {
      throw new Error('revenueProgram is undefined');
    }

    if (!upsertCustomizations) {
      throw new Error('upsertCustomizations is undefined');
    }

    if (await upsertCustomizations(customizationEdits, revenueProgram.id)) {
      enqueueSnackbar(`The changes made to ${HEADER_LABELS[emailType]} have been successfully saved.`, {
        persist: true,
        content: (key: string, message: string) => (
          <SystemNotification id={key} message={message} header="Changes Saved" type="success" />
        )
      });
    } else {
      enqueueSnackbar(
        `Something went wrong saving the changes you made to ${HEADER_LABELS[emailType]}. Please wait and try again.`,
        {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Failed to Save" type="error" />
          )
        }
      );
    }
  }

  return (
    <>
      <BackButtonContainer>
        <RouterLinkButton color="text" startIcon={<ArrowBackOutlined />} to={EMAILS_SLUG}>
          Back
        </RouterLinkButton>
      </BackButtonContainer>
      <HeaderSection title={HEADER_LABELS[emailType]} variant="dark" />
      <Sections>
        <SettingsSection hideBottomDivider orientation="vertical" title="Email Settings">
          <Fields>
            <TextField
              id="sender-email-address"
              label="Sender Email Address"
              disabled
              value="no-reply@fundjournalism.org"
            />
            <TextField id="sender-name" label="Sender Name" disabled value="News Revenue Engine" />
          </Fields>
        </SettingsSection>
        <SettingsSection
          hideBottomDivider
          orientation="vertical"
          subtitle="Logo and disclaimer are pulled from the default donation page."
          title="Edit Copy"
        >
          <div>
            <EditorToolbar editor={focusedEditor ?? null} />
            <ResetContentButton
              defaultContent={() => defaultEmailContent(emailType, focusedBlock!, revenueProgram!)}
              disabled={!revenueProgram || !focusedBlock}
              editor={focusedEditor ?? null}
            />
          </div>
          {revenueProgram && customizations && (
            <EmailPreview revenueProgram={revenueProgram}>
              <ClickAwayListener onClickAway={handleEditorBlur}>
                <div>
                  <EditorBlock
                    initialValue={
                      customizations?.message?.content_html ?? defaultEmailContent(emailType, 'message', revenueProgram)
                    }
                    label="Message"
                    onChange={handleEditorChange}
                    onFocus={({ editor }) => handleEditorFocus(editor, 'message')}
                  />
                </div>
              </ClickAwayListener>
            </EmailPreview>
          )}
        </SettingsSection>
        <Actions>
          <RouterLinkButton color="secondary" to={EMAILS_SLUG}>
            Cancel Changes
          </RouterLinkButton>
          <Button color="primaryDark" disabled={!editsPending} onClick={handleSave} startIcon={<SaveOutlined />}>
            Save
          </Button>
        </Actions>
      </Sections>
    </>
  );
}

export default EditEmailRoute;
