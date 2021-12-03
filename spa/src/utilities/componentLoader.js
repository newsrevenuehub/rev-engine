const componentLoader = (lazyComponent, attemptsLeft = 3, interval = 1000) => {
  return new Promise((resolve, reject) => {
    lazyComponent()
      .then(resolve)
      .catch((error) => {
        setTimeout(() => {
          if (attemptsLeft === 1) {
            reject(error);
            return;
          }
          componentLoader(lazyComponent, attemptsLeft - 1, interval).then(resolve, reject);
        }, interval);
      });
  });
};

export default componentLoader;
