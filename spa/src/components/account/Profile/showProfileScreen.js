function showProfileScreen(user) {
  if (user && user.organizations.length === 0) {
    if (user.role_type) {
      return false;
    }
    return true;
  }
  return false;
}

export default showProfileScreen;
