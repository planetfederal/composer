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
   * Fired when GeoServer is not responding.
   */
  ServerError: 'server-error',
  /**
   * Fired when sidenav resized.
   */
  SidenavResized: 'app-sidenav-resized',
  /**
   * Fired when sidenav resize is requested.
   */
  ToggleSidenav: 'toggle-sidenav',
    /**
   * Fired when a workspaces are fetched.
   */
  WorkspacesFetched: 'workspaces-fetched',
  /**
   * Fired when a workspace name is changed.
   */
  WorkspaceNameChanged: 'workspace-name-changed',
  /**
   * Fired when a new workspace is requested
   */
  CreateNewWorkspace: 'create-new-workspace',
  /**
   * Fired when a new workspace is created
   */
  WorkspaceCreated: 'workspace-created',
  /**
   * Fired when a new workspace is requested
   */
  WorkspaceDeleted: 'workspace-deleted',
  /**
   * Fired when a new map is requested
   */
  CreateNewMap: 'create-new-map',
  /**
   * Fired when data import is requested
   */
  ImportData: 'import-data',
  /**
   * Fired when a single map's settings are updated
   */
  MapUpdated: 'map-updated',
  /**
   * Fired when all maps are updated
   */
  MapsAllUpdated: 'maps-all-updated'
});
