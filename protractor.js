exports.config = {
  specs: ['app/**/*.spec.js'],
  keepAlive: true,
  seleniumServerJar: 
    'node_modules/grunt-protractor-runner/node_modules/protractor/selenium/selenium-server-standalone-2.43.1.jar',
  chromeDriver: 'node_modules/grunt-protractor-runner/node_modules/protractor/selenium/chromedriver'
}
