package org.opengeo.app;

import net.sf.json.JSONObject;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.LayerGroupInfo;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.config.GeoServer;
import org.geoserver.config.GeoServerInfo;
import org.geoserver.config.ServiceInfo;
import org.geoserver.config.SettingsInfo;
import org.geotools.util.Version;
import org.opengis.filter.Filter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * Summarizes information about the GeoServer instance.
 */
@Controller
@RequestMapping("/backend/serverInfo")
public class ServerInfoController extends AppController {

    @Autowired
    public ServerInfoController(GeoServer geoServer) {
        super(geoServer);
    }

    @RequestMapping(method= RequestMethod.GET)
    public @ResponseBody JSONObj get() {
        JSONObj obj = new JSONObj();
        obj.object();

        SettingsInfo settings = geoServer.getGlobal().getSettings();
        obj.object("server")
           .put("title", settings.getTitle())
           .end();

        obj.object("services");
        for (ServiceInfo service : geoServer.getServices()) {
            obj.object(service.getName())
               .put("title", service.getTitle());

            obj.array("versions");
            for (Version ver : service.getVersions()) {
                obj.add(ver.toString());
            }
            obj.end();

            obj.end();
        }
        obj.end();

        Catalog cat = geoServer.getCatalog();
        obj.object("catalog")
           .put("workspaces", cat.count(WorkspaceInfo.class, Filter.INCLUDE))
           .put("layers", cat.count(LayerInfo.class, Filter.INCLUDE))
           .put("maps", cat.count(LayerGroupInfo.class, Filter.INCLUDE))
           .end();

        return obj.end();
    }
}
