import { render, screen, fireEvent, waitFor } from 'test-utils';
import ProfileForm from './ProfileForm';

import Input from 'elements/inputs/Input';

const mockSubmit = jest.fn((email, password) => {
  return Promise.resolve({ email, password });
});

describe('ProfileForm Tests', () => {
  function getScreen() {
    return render(
      <div>
        <ProfileForm onProfileSubmit={mockSubmit} loading={false} />
      </div>
    );
  }
});
