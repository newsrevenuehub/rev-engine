/**
 * Does the user need to finalize their profile?
 * @param {user} user
 * @returns boolean
 */
function needsProfileFinalization(user) {
  if (user && user.organizations.length === 0) {
    if (user.role_type) {
      return false;
    }
    return true;
  }
  return false;
}

export default needsProfileFinalization;
