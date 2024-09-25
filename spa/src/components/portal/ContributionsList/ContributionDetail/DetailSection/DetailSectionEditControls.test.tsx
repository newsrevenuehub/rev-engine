import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import DetailSectionEditControls, { DetailSectionEditControlsProps } from './DetailSectionEditControls';

function tree(props?: Partial<DetailSectionEditControlsProps>) {
  return render(<DetailSectionEditControls onCancel={jest.fn()} onSave={jest.fn()} {...props} />);
}

describe('DetailSectionEditControls', () => {
  describe('Cancel button', () => {
    it('calls onCancel', () => {
      const onCancel = jest.fn();
      tree({ onCancel });

      screen.getByRole('button', { name: 'Cancel' }).click();
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('is enabled by default', () => {
      tree();

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    });

    it('is enabled when disabled is true', () => {
      tree({ saveDisabled: true });

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    });
  });

  describe('Save button', () => {
    it('calls onSave', () => {
      const onSave = jest.fn();
      tree({ onSave });

      screen.getByRole('button', { name: 'Save' }).click();
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('is enabled by default', () => {
      tree();

      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    it('is disabled when disabled is true', () => {
      tree({ saveDisabled: true });

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
