package org.opengeo.app;

import org.geoserver.config.GeoServer;

/**
 * Base class for app controllers.
 */
public abstract class AppController {

    protected GeoServer geoServer;

    public AppController(GeoServer geoServer) {
        this.geoServer = geoServer;
    }

}
