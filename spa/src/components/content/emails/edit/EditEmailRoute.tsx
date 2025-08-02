import { ArrowBackOutlined, SaveOutlined } from '@material-ui/icons';
import { Editor } from '@tiptap/react';
import { useSnackbar } from 'notistack';
import { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Button, TextField } from 'components/base';
import HeaderSection from 'components/common/HeaderSection';
import { Sections } from 'components/common/HeaderSection/HeaderSection.styled';
import EditorToolbar from 'components/content/emails/edit/EditorToolbar';
import SystemNotification from 'components/common/SystemNotification';
import { EmailCustomization, EmailCustomizationChanges, useEmailCustomizations } from 'hooks/useEmailCustomizations';
import useUser from 'hooks/useUser';
import { useRevenueProgram } from 'hooks/useRevenueProgram';
import { EMAILS_SLUG } from 'routes';
import EditorBlock from './EditorBlock';
import EmailPreview from './EmailPreview';
import ResetContentButton from './ResetContentButton';
import { defaultEmailContent } from './defaultContent';
import { Actions, BackButtonContainer, Fields, SettingsSection } from './EditEmailRoute.styled';
import { DiscardChangesButton } from 'components/common/DiscardChangesButton';

const HEADER_LABELS: Record<EmailCustomization['email_type'], string> = {
  contribution_receipt: 'Receipts'
};

export function EditEmailRoute() {
  const { emailType } = useParams<{ emailType: EmailCustomization['email_type'] }>();
  const { push } = useHistory();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useUser();
  const { revenueProgram } = useRevenueProgram(user?.revenue_programs[0].id);
  const [focusedBlock, setFocusedBlock] = useState<EmailCustomization['email_block']>();
  const [focusedEditor, setFocusedEditor] = useState<Editor>();
  const [focusedEditorSelection, setFocusedEditorSelection] = useState<Editor['state']['selection']>();
  const { customizations, upsertCustomizations } = useEmailCustomizations(emailType);
  const [customizationEdits, setCustomizationEdits] = useState<EmailCustomizationChanges>({});
  const changesPending = useMemo(() => {
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

  useEffect(() => {
    // If the user clicks outside of an editor or toolbar element, disconnect
    // the editor from the toolbar. We use a DOM attribute here to avoid having
    // to manage many refs--we need to track all editors, the toolbar, and also
    // any dropdown menus in the toolbar because they get portalled out into the
    // main document body.

    function handleGlobalClick(event: MouseEvent) {
      if ((event.target as HTMLElement).closest('[data-edit-email-route-maintain-editor-focus]')) {
        return;
      }

      setFocusedBlock(undefined);
      setFocusedEditor(undefined);
    }

    window.addEventListener('mouseup', handleGlobalClick);
    return () => window.removeEventListener('mouseup', handleGlobalClick);
  }, []);

  function handleEditorFocus(editor: Editor, block: EmailCustomization['email_block']) {
    setFocusedEditor(editor);
    setFocusedEditorSelection(editor.state.selection);
    setFocusedBlock(block);
  }

  function handleEditorChange(value: string) {
    setCustomizationEdits((existing) => ({ ...existing, [focusedBlock as string]: value }));
  }

  function handleEditorSelelectionUpdate(editor: Editor) {
    setFocusedEditorSelection(editor.state.selection);
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
      push(EMAILS_SLUG);
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
        <DiscardChangesButton
          changesPending={changesPending}
          color="text"
          onDiscard={() => push(EMAILS_SLUG)}
          startIcon={<ArrowBackOutlined />}
        >
          Back
        </DiscardChangesButton>
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
          subtitle="To change the logo or branding on these emails, update the corresponding elements on your default contribution page. Please note that the disclaimer text and copyright information cannot be edited, as they are autogenerated based on your organization's name and tax status."
          title="Edit Copy"
        >
          <div data-edit-email-route-maintain-editor-focus>
            <EditorToolbar editor={focusedEditor ?? null} selection={focusedEditorSelection} />
            <ResetContentButton
              defaultContent={() => defaultEmailContent(emailType, focusedBlock!, revenueProgram!)}
              disabled={!revenueProgram || !focusedBlock}
              editor={focusedEditor ?? null}
            />
          </div>
          {revenueProgram && customizations && (
            <EmailPreview revenueProgram={revenueProgram}>
              <div data-edit-email-route-maintain-editor-focus>
                <EditorBlock
                  initialValue={
                    customizations?.message?.content_html ?? defaultEmailContent(emailType, 'message', revenueProgram)
                  }
                  label="Message"
                  onChange={handleEditorChange}
                  onFocus={({ editor }) => handleEditorFocus(editor, 'message')}
                  onSelectionUpdate={({ editor }) => handleEditorSelelectionUpdate(editor)}
                />
              </div>
            </EmailPreview>
          )}
        </SettingsSection>
        <Actions>
          <DiscardChangesButton changesPending={changesPending} color="secondary" onDiscard={() => push(EMAILS_SLUG)}>
            Cancel Changes
          </DiscardChangesButton>
          <Button color="primaryDark" disabled={!changesPending} onClick={handleSave} startIcon={<SaveOutlined />}>
            Save
          </Button>
        </Actions>
      </Sections>
    </>
  );
}

export default EditEmailRoute;
