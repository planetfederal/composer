describe('app homepage', function() {
  function login() {
    element(by.model('creds.username')).sendKeys("admin");
    element(by.model('creds.password')).sendKeys("geoserver");
    element(by.buttonText('Login')).click();
  };

  beforeEach(function() {
    browser.get('http://localhost:8000');
  });

  it("should have a title", function() {
    expect(browser.getTitle()).toEqual('GeoServer');
  });

  it("should prompt for login", function() {
    expect(browser.getCurrentUrl()).toMatch(/login$/);
  });

  it("should forward to home page after login", function() {
    login();
    expect(element(by.binding('title')).getText()).toEqual('Summary');
  });

});