import { ConnectedProps } from '../Connected';
import { CreateUserProps } from '../CreateUser';
import { EnterApiKeyProps } from '../EnterApiKey';
import { GetApiKeyProps } from '../GetApiKey';
import { UserNeededProps } from '../UserNeeded';
import { UserQuestionProps } from '../UserQuestion';

export function Connected(props: ConnectedProps) {
  return (
    <div data-testid="mock-connected">
      <button onClick={props.onClose}>onClose</button>
    </div>
  );
}

export function CreateUser(props: CreateUserProps) {
  return (
    <div data-testid="mock-create-user">
      <button onClick={props.onNextStep}>onNextStep</button>
      <button onClick={props.onPreviousStep}>onPreviousStep</button>
    </div>
  );
}

export function GetApiKey(props: GetApiKeyProps) {
  return (
    <div data-testid="mock-get-api-key">
      <button onClick={props.onNextStep}>onNextStep</button>
      <button onClick={props.onPreviousStep}>onPreviousStep</button>
    </div>
  );
}

export function EnterApiKey(props: EnterApiKeyProps) {
  return (
    <div data-testid="mock-enter-api-key">
      <div data-testid="mock-enter-api-key-error">{props.error}</div>
      <button onClick={props.onPreviousStep}>onPreviousStep</button>
      <button onClick={() => props.onSetKeyAndUrl('mock-api-key', 'mock-server-url')}>onSetKeyAndUrl</button>
    </div>
  );
}

export function UserNeeded(props: UserNeededProps) {
  return (
    <div data-testid="mock-user-needed">
      <button onClick={props.onClose}>onClose</button>
    </div>
  );
}

export function UserQuestion(props: UserQuestionProps) {
  return (
    <div data-testid="mock-user-question">
      <button onClick={() => props.onNextStep(true)}>onNextStep true</button>
      <button onClick={() => props.onNextStep(false)}>onNextStep false</button>
    </div>
  );
}
