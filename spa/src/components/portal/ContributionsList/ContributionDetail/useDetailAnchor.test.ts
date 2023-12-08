import { renderHook } from '@testing-library/react-hooks';
import { useDetailAnchor } from './useDetailAnchor';

describe('useDetailAnchor', () => {
  let detail: HTMLElement;
  let detailParent: HTMLElement;
  let item: HTMLElement;

  beforeEach(() => {
    detail = document.createElement('div');
    detailParent = document.createElement('div');
    item = document.createElement('div');

    detailParent.appendChild(detail);
  });

  it('hides the detail element if the item element is null', () => {
    renderHook(() => useDetailAnchor(null, detail));
    expect(detail.style.visibility).toBe('hidden');
  });

  it('hides the detail element if it has no parent', () => {
    detail.remove();

    renderHook(() => useDetailAnchor(item, detail));
    expect(detail.style.visibility).toBe('hidden');
  });

  describe('When both parent and item element are defined', () => {
    it('shows the detail element', () => {
      renderHook(() => useDetailAnchor(item, detail));
      expect(detail.style.visibility).toBe('visible');
    });

    // Testing of positioning doesn't appear possible in jsdom. But if we could,
    // we'd want to test that:
    // - The detail is moved downward to match the item's offset if the parent permits
    // - The detail is moved to the bottom of the parent if it can't be moved exactly in place
  });
});
