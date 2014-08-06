package org.opengeo.app;

import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.Predicates;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.catalog.util.CloseableIterator;
import org.geoserver.config.GeoServer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping("/backend/workspaces")
public class WorkspaceController extends AppController {

    @Autowired
    public WorkspaceController(GeoServer geoServer) {
        super(geoServer);
    }

    @RequestMapping(method = RequestMethod.GET)
    public @ResponseBody JSONObj list() {
        JSONObj obj = new JSONObj().array();

        Catalog cat = geoServer.getCatalog();

        WorkspaceInfo def = cat.getDefaultWorkspace();
        if (def != null) {
           obj.object()
              .put("name", def.getName())
              .put("default", true)
              .end();
        }

        CloseableIterator<WorkspaceInfo> list = cat.list(WorkspaceInfo.class, Predicates.acceptAll());

        try {
            while(list.hasNext()) {
                WorkspaceInfo ws = list.next();
                if (def != null && ws.getName().equals(def.getName())) {
                    continue;
                }
                obj.object()
                   .put("name", ws.getName())
                   .put("default", false)
                   .end();
            }
        }
        finally {
            list.close();
        }

        return obj.end();
    }

}
