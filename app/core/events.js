/*
 * (c) 2014 Boundless, http://boundlessgeo.com
 */
/**
 * Module containing global constants for the app.
 */
angular.module('gsApp.core.event', [])
.constant('AppEvent', {
  /**
   * Fire when basemap added
   */
  BaseMapChanged: 'basemap-changed',
  /**
   * Fired when a new map is requested
   */
  CreateNewMap: 'create-new-map',
  /**
   * Fired when a new workspace is requested
   */
  CreateNewWorkspace: 'create-new-workspace',
  /**
   * Fire when map background color change is requested
   */
  EditorBackground: 'editor-background',
  /**
   * Fired when data import is requested
   */
  ImportData: 'import-data',
  /**
   * Fire when a new layer is added
   */
  LayerAdded: 'layers-added',
  /**
   * Fire when layers list in a workspace is updated
   */
  LayersAllUpdated: 'layers-all-updated',
  /**
   * Fire when a single layer in a workspace is updated
   */
  LayerUpdated: 'layer-updated',
  /**
   * Fired when user successfully logs in.
   */
  Login: 'app-login',
  /**
   * Fired on logout.
   */
  Logout: 'app-logout',
  /**
   * Fired when a map is added
   */
  MapAdded: 'map-added',
  /**
   * Fired when all maps are updated
   */
  MapsAllUpdated: 'maps-all-updated',
  /**
   * Fired when a map controls hide/show requested
   */
  MapControls: 'map-controls',
  /**
   * Fired when a map is edited
   */
  MapEdited: 'map-edited',
  /**
   * Fired when map render timeout updated
   */
  MapRenderTimeoutUpdated: 'map-rendertimeout-updated',
  /**
   * Fired when a single map's settings are updated
   */
  MapSettingsUpdated: 'map-settings-updated',
  /**
   * Fired when a single map's settings are updated
   */
  MapUpdated: 'map-updated',
  /**
   * Fire when custom projection is set
   */
  ProjSet: 'projection-set',
  /**
   * Fired when GeoServer is not responding.
   */
  ServerError: 'server-error',
  /**
   * Fired when sidenav resized.
   */
  SidenavResized: 'app-sidenav-resized',
  /**
   * Fired when a new store is added
   */
  StoreAdded: 'store-added',
  /**
   * Fired when an existing store is modified
   */
  StoreUpdated: 'store-updated',
  /**
   * Fired when fullscreen is toggled
   */
  ToggleFullscreen: 'toggle-fullscreen',
  /**
   * Fired when sidenav resize is requested.
   */
  ToggleSidenav: 'toggle-sidenav',
  /**
   * Fired when app makes un-authorized request to backend
   */
  Unauthorized: 'app-auth-unauthorized',
  /**
   * Fired when a workspace tab is requested
   */
  WorkspaceCreated: 'workspace-created',
  /**
   * Fired when a new workspace is requested
   */
  WorkspaceDeleted: 'workspace-deleted',
  /**
   * Fired when a workspaces are fetched.
   */
  WorkspacesFetched: 'workspaces-fetched',
  /**
   * Fired when a workspace name is changed.
   */
  WorkspaceNameChanged: 'workspace-name-changed',
  /**
   * Fired when a workspace is selected.
   */
  WorkspaceSelected: 'workspaces-selected',

  /**
   * Fired when a new workspace is created
   */
  WorkspaceTab: 'workspace-tab'

   
});
