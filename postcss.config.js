module.exports = {
  plugins: [
    require('postcss-simple-vars')({
      variables: require('./src/styles/vars'),
    }),
  ],
}
