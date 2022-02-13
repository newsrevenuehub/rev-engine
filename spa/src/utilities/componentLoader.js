const componentLoader = (lazyComponent, attemptsLeft = 10, interval = 1500) => {
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
