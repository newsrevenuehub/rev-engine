import { ContributionIntervalList } from 'utilities/getPageContributionIntervals';

export interface ElementDetailEditorProps<ContentType> {
  contributionIntervals: ContributionIntervalList;
  elementContent: ContentType;
  elementRequiredFields: string[];
  onChangeElementContent: (value: ContentType) => void;
  onChangeElementRequiredFields: (value: string[]) => void;
}
