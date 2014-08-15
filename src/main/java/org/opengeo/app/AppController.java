package org.opengeo.app;

import org.geoserver.config.GeoServer;
import org.geoserver.config.GeoServerDataDirectory;

/**
 * Base class for app controllers.
 */
public abstract class AppController {

    protected GeoServer geoServer;

    public AppController(GeoServer geoServer) {
        this.geoServer = geoServer;
    }

    protected GeoServerDataDirectory dataDir() {
        return new GeoServerDataDirectory(geoServer.getCatalog().getResourceLoader());
    }
}
