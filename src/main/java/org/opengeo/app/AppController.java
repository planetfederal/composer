package org.opengeo.app;

import org.geoserver.config.GeoServer;
import org.geoserver.config.GeoServerDataDirectory;

import javax.servlet.http.HttpServletRequest;

/**
 * Base class for app controllers.
 */
public abstract class AppController {

    public static final int DEFAULT_PAGESIZE = 25;

    protected GeoServer geoServer;

    public AppController(GeoServer geoServer) {
        this.geoServer = geoServer;
    }

    protected GeoServerDataDirectory dataDir() {
        return new GeoServerDataDirectory(geoServer.getCatalog().getResourceLoader());
    }

    protected Integer page(HttpServletRequest req) {
        String page = req.getParameter("page");
        return page != null ? Integer.parseInt(page) : null;
    }

    protected Integer pageSize(HttpServletRequest req, Integer def) {
        String size = req.getParameter("pagesize");
        return size != null ? Integer.parseInt(size) : def;
    }

    protected Integer offset(HttpServletRequest req) {
        Integer page = page(req);
        return page != null ? page * count(req) : null;
    }

    protected Integer count(HttpServletRequest req) {
        return pageSize(req, 25);
    }
}
