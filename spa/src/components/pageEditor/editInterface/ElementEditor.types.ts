import { ContributionIntervalList } from 'utilities/getPageContributionIntervals';

export interface ElementDetailEditorProps<ContentType> {
  /**
   * Contribution intervals set in the page.
   */
  contributionIntervals: ContributionIntervalList;
  /**
   * Content of the element being edited.
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
   * Allows an element editor to disable the Update button, e.g. if there are
   * validation errors in the editor.
   */
  setUpdateDisabled: (value: boolean) => void;
}
