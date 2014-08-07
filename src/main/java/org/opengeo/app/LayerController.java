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
    public @ResponseBody JSONObj list(@PathVariable String wsName) {
        JSONObj obj = new JSONObj().array();

        Catalog cat = geoServer.getCatalog();

        if ("default".equals(wsName)) {
            WorkspaceInfo def = cat.getDefaultWorkspace();
            if (def != null) {
                wsName = def.getName();
            }
        }

        CloseableIterator<LayerInfo> it =
            cat.list(LayerInfo.class, equal("resource.namespace.prefix", wsName), null, null, null);
        try {
            while (it.hasNext()) {
                LayerInfo l = it.next();
                ResourceInfo r = l.getResource();

                obj.object()
                   .put("name", l.getName())
                    .put("workspace", wsName)
                   .put("title", l.getTitle() != null ? l.getTitle() : r.getTitle())
                   .put("srs", r.getSRS())
                   .put("type", type(r))
                   .end();
            }
        }
        finally {
            it.close();
        }

        return obj.end();
    }

    @RequestMapping(value="/{wsName}/{name}", method = RequestMethod.GET)
    public @ResponseBody JSONObj get(@PathVariable String wsName, @PathVariable String name) {
        LayerInfo l = findLayer(wsName, name, geoServer.getCatalog());
        ResourceInfo r = l.getResource();

        JSONObj obj = new JSONObj().object();
        obj.put("name", name);
        obj.put("workspace", wsName);
        obj.put("srs", r.getSRS());

        bbox(obj, "bbox", r.getNativeBoundingBox());
        coordinate(obj, "center", r.getNativeBoundingBox().centre());

        obj.object("latlon");
        bbox(obj, "bbox", r.getLatLonBoundingBox());
        coordinate(obj, "center", r.getLatLonBoundingBox().centre());
        obj.end();


        return obj.end();
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
            return "Raster";
        }

        FeatureTypeInfo ft = (FeatureTypeInfo) r;
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

    JSONObj bbox(JSONObj obj, String key, Envelope bbox) {
        return obj.array(key).add(bbox.getMinX()).add(bbox.getMinY()).add(bbox.getMaxX()).add(bbox.getMaxY()).end();
    }

    JSONObj coordinate(JSONObj obj, String key, Coordinate coord) {
        return obj.array(key).add(coord.x).add(coord.y).end();
    }
}
