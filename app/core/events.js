/**
 * Module containing global constants for the app.
 */
angular.module('gsApp.core.event', [])
.constant('AppEvent', {
  /**
   * Fired when app makes un-authorized request to backend
   */
  Unauthorized: 'app-auth-unauthorized',
  /**
   * Fired when user successfully logs in.
   */
  Login: 'app-login',
  /**
   * Fired on logout.
   */
  Logout: 'app-logout',
  /**
   * Fired when sidenav resized.
   */
  SidenavResized: 'app-sidenav-resized'
});
