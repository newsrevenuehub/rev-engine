describe('Hub-tracked route', () => {
  it('should add a Google Analytics V3 tracker for the Hub', () => {});
  it('should record a page view with the appropriate analytics instance', () => {});
});

describe('Org- and hub-tracked route', () => {
  context('Org has not enabled any analytics', () => {
    it('should add an analytics tracker for the Hub but not for the Org', () => {});
    it('should record a page view with the appropriate analytics instance', () => {});
  });
  context('Org has enabled Google Analytics v3', () => {
    it('should add analytics trackers for Org and Hub', () => {});
    it('should record a page view with the appropriate analytics instance', () => {});
  });
});

describe('Analytics tracking for configured routes', () => {
  it('should make the right routes HubTrackedRoutes', () => {});
  it('should make the right routes OrgAndHubTrackedRoutes', () => {});
});
