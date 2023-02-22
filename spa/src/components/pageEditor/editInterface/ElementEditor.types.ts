import { ContributionPage } from 'hooks/useContributionPage';

export interface ElementDetailEditorProps<ContentType> {
  /**
   * Content of the element being edited, including changes made by the detail
   * editor itself.
   */
  elementContent: ContentType;
  /**
   * Required fields of the element being edited. These are required of a
   * contributor completing the form later, not the page editor.
   */
  elementRequiredFields: string[];
  /**
   * Setter for element content.
   */
  onChangeElementContent: (value: ContentType) => void;
  /**
   * Setter for element required fields.
   */
  onChangeElementRequiredFields: (value: string[]) => void;
  /**
   * Preview of the updated page as a whole, including changes made by the
   * detail editor itself. This is used by element editors that need to change
   * their behavior based on something set elsewhere in the page.
   */
  pagePreview: ContributionPage;
  /**
   * Allows an element editor to disable the Update button, e.g. if there are
   * validation errors in the editor.
   */
  setUpdateDisabled: (value: boolean) => void;
}
