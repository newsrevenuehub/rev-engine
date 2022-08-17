module.exports = {
  webpack: {
    configure: {
      module: {
        rules: [
          {
            type: 'javascript/auto',
            test: /\.js$/,
            include: /node_modules/
          }
        ]
      }
    }
  }
};
