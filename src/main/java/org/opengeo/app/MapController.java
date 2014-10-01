package org.opengeo.app;

import com.google.common.base.Function;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.vividsolutions.jts.geom.Envelope;

import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.FeatureTypeInfo;
import org.geoserver.catalog.LayerGroupInfo;
import org.geoserver.catalog.LayerGroupInfo.Mode;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.PublishedInfo;
import org.geoserver.catalog.ResourceInfo;
import org.geoserver.catalog.StyleInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.catalog.util.CloseableIterator;
import org.geoserver.config.GeoServer;
import org.geotools.feature.NameImpl;
import org.geotools.geometry.jts.ReferencedEnvelope;
import org.geotools.referencing.CRS;
import org.geotools.referencing.crs.DefaultGeocentricCRS;
import org.geotools.referencing.crs.DefaultGeographicCRS;
import org.geotools.util.logging.Logging;
import org.opengis.referencing.FactoryException;
import org.opengis.referencing.crs.CoordinateReferenceSystem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;

import javax.annotation.Nullable;
import javax.servlet.http.HttpServletRequest;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import static org.geoserver.catalog.Predicates.equal;

@Controller
@RequestMapping("/api/maps")
public class MapController extends AppController {

    static Logger LOG = Logging.getLogger(LayerController.class);

    @Autowired
    public MapController(GeoServer geoServer) {
        super(geoServer);
    }

    @RequestMapping(value = "/{wsName}", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public @ResponseBody JSONObj create(@PathVariable String wsName,
                                        @RequestBody JSONObj obj) {
        String name = obj.str("name");
        String title = obj.str("title");
        String description = obj.str("description");
        
        String user = SecurityContextHolder.getContext().getAuthentication().getName();
        Date created = new Date();
        String change = "Initial creation";
        
        CoordinateReferenceSystem crs = DefaultGeographicCRS.WGS84;
        if( obj.has("proj")){
            String srs = obj.str("proj");
            try {
                crs = CRS.decode(srs);
            } catch (FactoryException e) {
                LOG.log(Level.FINE, wsName+"."+name+" unrecorgnized proj:"+srs,e);
            }
        }
        Envelope envelope = IO.bounds(obj.object("bbox"));
        ReferencedEnvelope bounds = new ReferencedEnvelope( envelope, crs );
        
        Catalog cat = geoServer.getCatalog();
        LayerGroupInfo map = cat.getFactory().createLayerGroup();
        map.setName( name );
        map.setAbstract( description );
        map.setTitle( title );
        map.setMode( Mode.SINGLE );
        map.setWorkspace( findWorkspace(wsName) );
        map.setBounds( bounds );
        
        map.getMetadata().put("user", user );
        map.getMetadata().put("created", created );
        map.getMetadata().put("change", change );
        
        cat.add( map );
        return map(new JSONObj(), map, wsName, true);
    }
    
    @RequestMapping(value = "/{wsName}/{name}", method = RequestMethod.DELETE)
    public @ResponseBody JSONArr delete(@PathVariable String wsName,
                                        @PathVariable String name) {
        LayerGroupInfo map = findMap(wsName,name);
        geoServer.getCatalog().remove(map);
        
        return list(wsName);
    }
    
    @RequestMapping(value="/{wsName}/{name}", method = RequestMethod.GET)
    public @ResponseBody JSONObj get(@PathVariable String wsName,
                                     @PathVariable String name) {
        LayerGroupInfo map = findMap(wsName, name);
        return map(new JSONObj(), map, wsName, true);
    }

    @RequestMapping(value = "/{wsName}/{name}", method = RequestMethod.PATCH)
    public @ResponseBody JSONObj patch(@PathVariable String wsName,
                                       @PathVariable String name,
                                       @RequestBody JSONObj obj) {
        return put(wsName, name, obj);
    }

    @RequestMapping(value = "/{wsName}/{name}", method = RequestMethod.PUT)
    public @ResponseBody JSONObj put(@PathVariable String wsName,
                                     @PathVariable String name, 
                                     @RequestBody JSONObj obj) {
        LayerGroupInfo map = findMap(wsName, name);
        
        if(obj.has("name")){
            map.setName( obj.str("name"));
        }
        if(obj.has("title")){
            map.setTitle(obj.str("title"));
        }
        if(obj.has("abstract")){
            map.setAbstract(obj.str("abstract"));
        }
        if(obj.has("proj")&&obj.has("bbox")){
            CoordinateReferenceSystem crs = DefaultGeographicCRS.WGS84;
            if( obj.has("proj")){
                String srs = obj.str("proj");
                try {
                    crs = CRS.decode(srs);
                } catch (FactoryException e) {
                    LOG.log(Level.FINE, wsName+"."+name+" unrecorgnized proj:"+srs,e);
                }
            }
            Envelope envelope = IO.bounds(obj.object("bbox"));
            ReferencedEnvelope bounds = new ReferencedEnvelope( envelope, crs );
            map.setBounds(bounds);
        }        
        String user = SecurityContextHolder.getContext().getAuthentication().getName();
        map.getMetadata().put("user", user );
        
        map.getMetadata().put("modified", new Date() );
        
        if(obj.has("change")){
            map.getMetadata().put("change", obj.str("change") );
        }
        else {
            map.getMetadata().put("change", "modified "+obj.keys() );
        }
        return map(new JSONObj(), map, wsName, true);
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

        CloseableIterator<LayerGroupInfo> it = cat.list(LayerGroupInfo.class, equal("workspace.name", wsName));
        try {
            while (it.hasNext()) {
                LayerGroupInfo map = it.next();
                if( checkMap( map ) ){
                    map(arr.addObject(), map, wsName, false);
                }
            }
        }
        finally {
            it.close();
        }

        return arr;
    }

    @RequestMapping(value="/{wsName}/{name}/layers", method = RequestMethod.GET)
    public @ResponseBody JSONArr layers(@PathVariable String wsName, @PathVariable String name) {
        LayerGroupInfo m = findMap(wsName, name);

        JSONArr arr = new JSONArr();
        for (LayerInfo l : m.layers()) {
            IO.layer(arr.addObject(), l);
        }
        return arr;
    }

    @RequestMapping(value="/{wsName}/{name}/layers", method = RequestMethod.PUT)
    public @ResponseBody void layers(@RequestBody JSONArr layers, @PathVariable String wsName, @PathVariable String name) {
        LayerGroupInfo m = findMap(wsName, name);

        List<MapLayer> mapLayers = new ArrayList();
        for (int i = 0; i < m.getLayers().size(); i++) {
            mapLayers.add(new MapLayer(m.getLayers().get(i), m.getStyles().get(i)));
        }

        Map<String,MapLayer> map = Maps.uniqueIndex(mapLayers, new Function<MapLayer, String>() {
            @Nullable
            @Override
            public String apply(@Nullable MapLayer input) {
                return input.layer.getName();
            }
        });

        Catalog cat = geoServer.getCatalog();
        List<PublishedInfo> reLayers = new ArrayList<PublishedInfo>();
        List<StyleInfo> reStyles = new ArrayList<StyleInfo>();

        for (JSONObj l : Lists.reverse(Lists.newArrayList(layers.objects()))) {
            String layerName = l.str("name");
            String layerWorkspace = l.str("worskpace");

            MapLayer mapLayer = map.get(layerName);
            if (mapLayer == null) {
                LayerInfo layer = layerWorkspace != null ? cat.getLayerByName(new NameImpl(layerWorkspace, layerName))
                    : cat.getLayerByName(layerName);
                if (layer != null) {
                    mapLayer = new MapLayer(layer, layer.getDefaultStyle());
                }
            }

            if (mapLayer == null) {
                throw new NotFoundException("No such layer: " + l.toString());
            }

            reLayers.add(mapLayer.layer);
            reStyles.add(mapLayer.style);
        }

        m.getLayers().clear();
        m.getLayers().addAll(reLayers);

        m.getStyles().clear();
        m.getStyles().addAll(reStyles);

        cat.save(m);
    }

    private boolean checkMap(LayerGroupInfo map) {
        if( map.getMode() != Mode.SINGLE ) {
            return false;
        }
        for( int i = 0; i < map.styles().size(); i++){
            LayerInfo style = map.layers().get(i);
            List<PublishedInfo> layer = map.getLayers();
            if( layer instanceof LayerInfo &&
                style != ((LayerInfo)layer).getDefaultStyle() ){
                return false;
            }
            else if (layer instanceof LayerGroupInfo &&
                     style != ((LayerGroupInfo)layer).getRootLayerStyle() ){
                return false;
            }
        }
        return true;
    }

    List<LayerInfo> layers(LayerGroupInfo map) {
        return Lists.reverse(map.layers());
    }

    JSONObj map(JSONObj obj, LayerGroupInfo map, String wsName, boolean details) {

        obj.put("name", map.getName())
           .put("workspace", wsName)
           .put("title", map.getTitle())
           .put("description", map.getAbstract());

        ReferencedEnvelope bounds = map.getBounds();
        IO.proj(obj.putObject("proj"), bounds.getCoordinateReferenceSystem(), null);
        IO.bounds(obj.putObject("bbox"), bounds);
        
        // metadata describing last edit
        IO.metadata( obj, map.getMetadata(), "author");
        IO.metadata( obj, map.getMetadata(), "created");
        IO.metadata( obj, map.getMetadata(), "modified");
        IO.metadata( obj, map.getMetadata(), "change");
        
        JSONArr layers = obj.putArray("layers");

        for (LayerInfo l : layers(map)) {
            layers.addObject().put("name", l.getName()).put("workspace", wsName);
        }

        return obj;
    }
    
    WorkspaceInfo findWorkspace(String wsName) {
        Catalog cat = geoServer.getCatalog();
        WorkspaceInfo ws;
        if ("default".equals(wsName)) {
            ws = cat.getDefaultWorkspace();
        } else {
            ws = cat.getWorkspaceByName(wsName);
        }
        if (ws == null) {
            throw new RuntimeException("Unable to find workspace " + wsName);
        }
        return ws;
    }
    
    LayerGroupInfo findMap(String wsName, String name) {
        Catalog cat = geoServer.getCatalog();
        LayerGroupInfo m = cat.getLayerGroupByName(wsName, name);
        if (m == null) {
            throw new NotFoundException(String.format("No such map %s:%s", wsName, name));
        }
        return m;
    }

    static class MapLayer {
        PublishedInfo layer;
        StyleInfo style;

        public MapLayer(PublishedInfo layer, StyleInfo style) {
            this.layer = layer;
            this.style = style;
        }
    }
}
