function flagIsActiveForUser(flagName, userFlags) {
  return userFlags.some((flag) => {
    return flag.name === flagName;
  });
}

export default flagIsActiveForUser;
