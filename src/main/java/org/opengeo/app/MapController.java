package org.opengeo.app;

import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.FeatureTypeInfo;
import org.geoserver.catalog.LayerGroupInfo;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.ResourceInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.catalog.util.CloseableIterator;
import org.geoserver.config.GeoServer;
import org.geotools.feature.NameImpl;
import org.geotools.geometry.jts.ReferencedEnvelope;
import org.geotools.util.logging.Logging;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.logging.Logger;

import static org.geoserver.catalog.Predicates.equal;

@Controller
@RequestMapping("/backend/maps")
public class MapController extends AppController {

    static Logger LOG = Logging.getLogger(LayerController.class);

    @Autowired
    public MapController(GeoServer geoServer) {
        super(geoServer);
    }

    @RequestMapping(value="/{wsName}", method = RequestMethod.GET)
    public @ResponseBody
    JSONArr list(@PathVariable String wsName) {
        JSONArr arr = new JSONArr();

        Catalog cat = geoServer.getCatalog();

        if ("default".equals(wsName)) {
            WorkspaceInfo def = cat.getDefaultWorkspace();
            if (def != null) {
                wsName = def.getName();
            }
        }

        CloseableIterator<LayerGroupInfo> it = cat.list(LayerGroupInfo.class, equal("workspace.name", wsName));
        try {
            while (it.hasNext()) {
                map(arr.addObject(), it.next(), wsName, false);
            }
        }
        finally {
            it.close();
        }

        return arr;
    }

    @RequestMapping(value="/{wsName}/{name}", method = RequestMethod.GET)
    public @ResponseBody JSONObj get(@PathVariable String wsName, @PathVariable String name) {
        LayerGroupInfo m = findMap(wsName, name, geoServer.getCatalog());
        return map(new JSONObj(), m, wsName, true);
    }

    @RequestMapping(value="/{wsName}/{name}/layers", method = RequestMethod.GET)
    public @ResponseBody JSONArr layers(@PathVariable String wsName, @PathVariable String name) {
        LayerGroupInfo m = findMap(wsName, name, geoServer.getCatalog());

        JSONArr arr = new JSONArr();
        for (LayerInfo l : m.layers()) {
            IO.layer(arr.addObject(), l);
        }
        return arr;
    }

    JSONObj map(JSONObj obj, LayerGroupInfo map, String wsName, boolean details) {

        obj.put("name", map.getName())
           .put("workspace", wsName)
           .put("title", map.getTitle());

        ReferencedEnvelope bounds = map.getBounds();
        IO.proj(obj.putObject("proj"), bounds.getCoordinateReferenceSystem(), null);
        IO.bounds(obj.putObject("bbox"), bounds);

        JSONArr layers = obj.putArray("layers");

        for (LayerInfo l : map.layers()) {
            layers.addObject().put("name", l.getName()).put("workspace", wsName);
        }

        return obj;
    }

    LayerGroupInfo findMap(String wsName, String name, Catalog cat) {
        LayerGroupInfo m = cat.getLayerGroupByName(wsName, name);
        if (m == null) {
            throw new NotFoundException(String.format("No such map %s:%s", wsName, name));
        }
        return m;
    }
}
