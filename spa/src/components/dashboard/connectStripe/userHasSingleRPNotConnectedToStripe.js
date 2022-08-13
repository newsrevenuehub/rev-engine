function userHasSingleRPNotConnectedToStripe(userDetails) {
  if (userDetails && userDetails.revenue_programs && userDetails.revenue_programs.length === 1) {
    // Add a check for the RP Payment Provider when api returns
    return true;
  }
  return false;
}

export default userHasSingleRPNotConnectedToStripe;
