function userHasSingleRPNotConnectedToStripe(userDetails) {
  if (userDetails && userDetails.revenue_programs && userDetails.revenue_programs.length === 1) {
    // TODO: Add a check for the RP Payment Provider when api returns

    // Only org_admin and not rp_admin is  allowed to connect stripe
    const roles = userDetails.role_type;
    if (!roles.includes('org_admin')) {
      return false;
    }
    return true;
  }
  return false;
}

export default userHasSingleRPNotConnectedToStripe;
