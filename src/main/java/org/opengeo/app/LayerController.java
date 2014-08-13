package org.opengeo.app;

import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.Envelope;
import com.vividsolutions.jts.geom.Geometry;
import org.apache.wicket.util.resource.ResourceStreamNotFoundException;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.CoverageInfo;
import org.geoserver.catalog.FeatureTypeInfo;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.ResourceInfo;
import org.geoserver.catalog.StyleInfo;
import org.geoserver.catalog.Styles;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.catalog.util.CloseableIterator;
import org.geoserver.config.GeoServer;
import org.geotools.feature.NameImpl;
import org.geotools.geometry.jts.Geometries;
import org.geotools.styling.Style;
import org.geotools.styling.StyledLayerDescriptor;
import org.geotools.util.logging.Logging;
import org.json.simple.JSONObject;
import org.opengis.feature.type.FeatureType;
import org.opengis.feature.type.GeometryDescriptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;
import org.w3.xlink.ResourceType;

import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger;

import static org.geoserver.catalog.Predicates.*;

@Controller
@RequestMapping("/backend/layers")
public class LayerController extends AppController {

    static Logger LOG = Logging.getLogger(LayerController.class);

    @Autowired
    public LayerController(GeoServer geoServer) {
        super(geoServer);
    }

    @RequestMapping(value="/{wsName}", method = RequestMethod.GET)
    public @ResponseBody JSONArr list(@PathVariable String wsName) {
        JSONArr arr = new JSONArr();

        Catalog cat = geoServer.getCatalog();

        if ("default".equals(wsName)) {
            WorkspaceInfo def = cat.getDefaultWorkspace();
            if (def != null) {
                wsName = def.getName();
            }
        }

        CloseableIterator<LayerInfo> it =
            cat.list(LayerInfo.class, equal("resource.namespace.prefix", wsName));
        try {
            while (it.hasNext()) {
                layer(arr.addObject(), it.next(), wsName, false);
            }
        }
        finally {
            it.close();
        }

        return arr;
    }

    @RequestMapping(value="/{wsName}/{name}", method = RequestMethod.GET)
    public @ResponseBody JSONObj get(@PathVariable String wsName, @PathVariable String name) {
        LayerInfo l = findLayer(wsName, name, geoServer.getCatalog());
        return layer(new JSONObj(), l, wsName, true);
    }

    @RequestMapping(value="/{wsName}/{name}/style", method = RequestMethod.GET)
    public @ResponseBody StyledLayerDescriptor style(@PathVariable String wsName, @PathVariable String name)
        throws IOException {
        LayerInfo l = findLayer(wsName, name, geoServer.getCatalog());
        StyleInfo s = l.getDefaultStyle();
        if (s == null) {
            throw new NotFoundException(String.format("Layer %s:%s has no default style", wsName, name));
        }

        Style style = s.getStyle();
        return Styles.sld(style);
    }

    @RequestMapping(value="/{wsName}/{name}/style", method = RequestMethod.PUT)
    public void style(@RequestBody StyledLayerDescriptor sld, @PathVariable String wsName, @PathVariable String name) {
    }

    LayerInfo findLayer(String wsName, String name, Catalog cat) {
        LayerInfo l = cat.getLayerByName(new NameImpl(wsName, name));
        if (l == null) {
            throw new NotFoundException(String.format("No such layer %s:%s", wsName, name));
        }
        return l;
    }

    String type(ResourceInfo r)  {
        if (r instanceof CoverageInfo) {
            return "raster";
        }
        else {
            return "vector";
        }
    }

    String geometry(FeatureTypeInfo ft) {
        try {
            FeatureType schema = ft.getFeatureType();
            GeometryDescriptor gd = schema.getGeometryDescriptor();
            if (gd == null) {
                return "Vector";
            }

            Geometries geomType = Geometries.getForBinding((Class<? extends Geometry>) gd.getType().getBinding());
            return geomType.getName();
        } catch (IOException e) {
            LOG.log(Level.WARNING, "Error looking up schema", e);
            return "Unknown";
        }
    }

    JSONObj layer(JSONObj obj, LayerInfo l, String wsName, boolean details) {
        ResourceInfo r = l.getResource();
        obj.put("name", l.getName())
            .put("workspace", wsName)
            .put("title", l.getTitle() != null ? l.getTitle() : r.getTitle())
            .put("type", type(r));

        if (r instanceof FeatureTypeInfo) {
            FeatureTypeInfo ft = (FeatureTypeInfo) r;
            obj.put("geometry", geometry(ft));
        }

        JSONObj proj = obj.putObject("proj");
        proj.put("srs", r.getSRS());
        //TODO: units

        JSONObj bbox = obj.putObject("bbox");
        bbox(bbox.putObject("native"), r.getNativeBoundingBox());
        bbox(bbox.putObject("lonlat"), r.getLatLonBoundingBox());

        return obj;
    }

    JSONObj bbox(JSONObj obj, Envelope bbox) {
        Coordinate center = bbox.centre();
        obj.put("west", bbox.getMinX())
           .put("south", bbox.getMinY())
           .put("east", bbox.getMaxX())
           .put("north", bbox.getMaxY())
           .putArray("center").add(center.x).add(center.y);
        return obj;
    }

}
