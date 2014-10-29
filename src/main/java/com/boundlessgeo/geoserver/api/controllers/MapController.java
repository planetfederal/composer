/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import static org.geoserver.catalog.Predicates.equal;

import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.annotation.Nullable;
import javax.servlet.http.HttpServletRequest;

import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.LayerGroupInfo;
import org.geoserver.catalog.LayerGroupInfo.Mode;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.PublishedInfo;
import org.geoserver.catalog.ResourceInfo;
import org.geoserver.catalog.StoreInfo;
import org.geoserver.catalog.StyleInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.catalog.util.CloseableIterator;
import org.geoserver.config.GeoServer;
import org.geoserver.platform.GeoServerResourceLoader;
import org.geoserver.platform.resource.Paths;
import org.geoserver.platform.resource.Resource;
import org.geoserver.platform.resource.Resource.Type;
import org.geotools.feature.NameImpl;
import org.geotools.geometry.jts.ReferencedEnvelope;
import org.geotools.referencing.CRS;
import org.geotools.referencing.crs.DefaultGeographicCRS;
import org.geotools.util.logging.Logging;
import org.opengis.referencing.FactoryException;
import org.opengis.referencing.crs.CoordinateReferenceSystem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;

import com.boundlessgeo.geoserver.api.exceptions.BadRequestException;
import com.boundlessgeo.geoserver.api.exceptions.NotFoundException;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;
import com.google.common.base.Function;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.vividsolutions.jts.geom.Envelope;

@Controller
@RequestMapping("/api/maps")
public class MapController extends ApiController {

    static Logger LOG = Logging.getLogger(MapController.class);

    @Autowired
    public MapController(GeoServer geoServer) {
        super(geoServer);
    }

    @RequestMapping(value = "/{wsName}", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public @ResponseBody
    JSONObj create(@PathVariable String wsName, @RequestBody JSONObj obj, HttpServletRequest req) {
        String name = obj.str("name");

        if (name == null) {
            throw new BadRequestException("Map object requires name");
        }

        try {
            findMap(wsName, name);
            throw new BadRequestException("Map named '" + name + "' already exists");
        }
        catch(NotFoundException e) {
            // good!
        }

        String title = obj.str("title");
        String description = obj.str("abstract");
        
        Date created = new Date();

        CoordinateReferenceSystem crs = DefaultGeographicCRS.WGS84;

        JSONObj proj = obj.object("proj");
        if (proj != null) {
            try {
                crs = IO.crs(proj);
            } catch (Exception e) {
                throw new BadRequestException("Error parsing proj: " + proj.toString());
            }
        }
        else {
            throw new BadRequestException("Map object requires projection");
        }

        ReferencedEnvelope bounds = null;
        boolean updateBounds = false;

        if (obj.has("bbox")) {
            Envelope envelope = IO.bounds(obj.object("bbox"));
            bounds = new ReferencedEnvelope( envelope, crs );
        }
        else {
            bounds = new ReferencedEnvelope(crs);
            updateBounds = true;
        }

        Catalog cat = geoServer.getCatalog();
        if (!obj.has("layers")) {
            throw new BadRequestException("Map object requires layers array");
        }

        LayerGroupInfo map = cat.getFactory().createLayerGroup();
        map.setName( name );
        map.setAbstract( description );
        map.setTitle( title );
        map.setMode( Mode.SINGLE );
        map.setWorkspace( findWorkspace(wsName, cat) );

        for (Object o : obj.array("layers")) {
            JSONObj l = (JSONObj) o;

            LayerInfo layer = findLayer(wsName, l.str("name"), cat);
            map.getLayers().add(layer);
            map.getStyles().add(null);

            if (updateBounds) {
                try {
                    updateBounds(bounds, layer);
                } catch (Exception e) {
                    throw new RuntimeException("Error calculating map bounds ", e);
                }
            }

        }

        map.setBounds( bounds );

        Metadata.created(map, created);
        Metadata.modified(map, created);

        cat.add( map );
        return mapDetails(new JSONObj(), map, wsName, req);
    }

    void updateBounds(ReferencedEnvelope bounds, LayerInfo layer) throws Exception {
        ResourceInfo r = layer.getResource();
        if (r.boundingBox() != null && CRS.equalsIgnoreMetadata(bounds.getCoordinateReferenceSystem(), r.getCRS())) {
            bounds.include(r.boundingBox());
        }
        else {
            bounds.include(r.getLatLonBoundingBox().transform(bounds.getCoordinateReferenceSystem(), true));
        }
    }

    @RequestMapping(value = "/{wsName}/{name}", method = RequestMethod.DELETE)
    public @ResponseBody
    JSONArr delete(@PathVariable String wsName,
                                        @PathVariable String name) {
        LayerGroupInfo map = findMap(wsName,name);
        geoServer.getCatalog().remove(map);
        
        return list(wsName);
    }
    
    @RequestMapping(value="/{wsName}/{name}", method = RequestMethod.GET)
    public @ResponseBody JSONObj get(@PathVariable String wsName,
                                     @PathVariable String name, HttpServletRequest req) {
        LayerGroupInfo map = findMap(wsName, name);
        return mapDetails(new JSONObj(), map, wsName, req);
    }

    @RequestMapping(value = "/{wsName}/{name}", method = RequestMethod.PATCH)
    public @ResponseBody JSONObj patch(@PathVariable String wsName,
                                       @PathVariable String name,
                                       @RequestBody JSONObj obj,HttpServletRequest req) {
        return put(wsName, name, obj,req);
    }

    @RequestMapping(value = "/{wsName}/{name}", method = RequestMethod.PUT)
    public @ResponseBody JSONObj put(@PathVariable String wsName,
                                     @PathVariable String name, 
                                     @RequestBody JSONObj obj,
                                     HttpServletRequest req) {
        LayerGroupInfo map = findMap(wsName, name);
        Catalog cat = geoServer.getCatalog();
        
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
        if(obj.has("layers")){
            List<LayerInfo> layers = new ArrayList<LayerInfo>();
            for(Iterator<Object> i = obj.array("layers").iterator();i.hasNext();){
                JSONObj l = (JSONObj) i.next();
                String n = l.str("workspace")+":"+l.str("name");
                LayerInfo layer = cat.getLayerByName(n);
                layers.add(layer);
            }
            map.layers().clear();
            map.layers().addAll(layers);
        }
        // update configuration history        
        String user = SecurityContextHolder.getContext().getAuthentication().getName();
        map.getMetadata().put("user", user );
        map.getMetadata().put("modified", new Date() );
        if(obj.has("change")){
            map.getMetadata().put("change", obj.str("change") );
        }
        else {
            map.getMetadata().put("change", "modified "+obj.keys() );
        }
        cat.save(map);
        
        return mapDetails(new JSONObj(), map, wsName, req);
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
                    JSONObj obj = arr.addObject();
                    map(obj, map, wsName);
                }
            }
        }
        finally {
            it.close();
        }
        return arr;
    }
    
    private JSONArr mapLayerList(LayerGroupInfo map, HttpServletRequest req){
        JSONArr arr = new JSONArr();
        for (PublishedInfo l : Lists.reverse(map.getLayers())) {
            layer(arr.addObject(), l, req);
        }
        return arr;
    }
    @RequestMapping(value="/{wsName}/{name}/layers", method = RequestMethod.GET)
    public @ResponseBody
    JSONArr mapLayerListGet(@PathVariable String wsName,
                            @PathVariable String name, HttpServletRequest req) {
        LayerGroupInfo m = findMap(wsName, name);
        return mapLayerList(m,req);
    }

    @RequestMapping(value="/{wsName}/{name}/layers", method = RequestMethod.PUT)
    public @ResponseBody JSONArr mapLayerListPut(@PathVariable String wsName,
                                                 @PathVariable String name,
                                                 @RequestBody JSONArr layers, HttpServletRequest req) {
        Catalog cat = geoServer.getCatalog();
        LayerGroupInfo m = findMap(wsName, name);

        // original
        List<MapLayer> mapLayers = MapLayer.list(m);
        Map<String,MapLayer> lookup = Maps.uniqueIndex(mapLayers, new Function<MapLayer, String>() {
            @Nullable
            public String apply(@Nullable MapLayer input) {
                return input.layer.getName();
            }
        });
        // modified
        List<PublishedInfo> reLayers = new ArrayList<PublishedInfo>();
        Map<String,PublishedInfo> check = Maps.uniqueIndex(reLayers, new Function<PublishedInfo, String>() {
            @Nullable
            public String apply(@Nullable PublishedInfo input) {
                return input.getName();
            }
        });
        List<StyleInfo> reStyles = new ArrayList<StyleInfo>();
        for (JSONObj l : Lists.reverse(Lists.newArrayList(layers.objects()))) {
            String layerName = l.str("name");
            String layerWorkspace = l.str("workspace");
            MapLayer mapLayer = lookup.get(layerName);
            if (mapLayer == null) {
                LayerInfo layer = findLayer( layerWorkspace, layerName);
                if (layer != null) {
                    mapLayer = new MapLayer(layer, layer.getDefaultStyle());
                }
            }
            if (mapLayer == null) {
                throw new NotFoundException("No such layer: " + l.toString());
            }
            if(check.containsKey(layerName)){
                throw new BadRequestException("Duplicate layer: " + l.toString() );
            }
            reLayers.add(mapLayer.layer);
            reStyles.add(mapLayer.style);
        }
        m.getLayers().clear();
        m.getLayers().addAll(reLayers);
        m.getStyles().clear();
        m.getStyles().addAll(reStyles);
        cat.save(m);
        return mapLayerList(m,req);
    }
    @RequestMapping(value="/{wsName}/{name}/layers", method = RequestMethod.POST)
    public @ResponseBody JSONArr mapLayerListPost(@PathVariable String wsName,
                                                  @PathVariable String name,
                                                  @RequestBody JSONArr layers, HttpServletRequest req) {
        Catalog cat = geoServer.getCatalog();
        LayerGroupInfo m = findMap(wsName, name);
        List<PublishedInfo> appendLayers = new ArrayList<PublishedInfo>();
        Map<String,PublishedInfo> check = Maps.uniqueIndex(appendLayers, new Function<PublishedInfo, String>() {
            @Nullable
            public String apply(@Nullable PublishedInfo input) {
                return input.getName();
            }
        });
        List<StyleInfo> appendStyles = new ArrayList<StyleInfo>();
        for (JSONObj l : Lists.reverse(Lists.newArrayList(layers.objects()))) {
            String layerName = l.str("name");
            String layerWorkspace = l.str("worskpace");
            if( check.containsKey(layerName)){
                throw new BadRequestException("Duplicate layer: " + l.toString() );
            }
            LayerInfo layer = findLayer(layerWorkspace, layerName);
            if (layer == null) {
                throw new NotFoundException("No such layer: " + l.toString());
            }
            appendLayers.add(layer);
            appendStyles.add(layer.getDefaultStyle());
        }
        m.getLayers().addAll(appendLayers);
        m.getStyles().addAll(appendStyles);
        cat.save(m);
        return mapLayerList(m,req);
    }
    
    @RequestMapping(value="/{wsName}/{mpName}/layers/{name}", method = RequestMethod.GET)
    public @ResponseBody JSONObj mapLayerGet(@PathVariable String wsName,
                                             @PathVariable String mpName,
                                             @PathVariable String name, HttpServletRequest req) {
        LayerGroupInfo map = findMap(wsName, mpName);
        PublishedInfo layer = findMapLayer( map, name );
        
        JSONObj obj = layer(new JSONObj(), layer, req);
        obj.putObject("map")
            .put("name",  mpName )
            .put("url",IO.url(req,"/maps/%s/%s",wsName,mpName));
        return obj;
    }

    @RequestMapping(value="/{wsName}/{mpName}/layers/{name}", method = RequestMethod.DELETE)
    public @ResponseBody JSONObj mapLayerDelete(@PathVariable String wsName,
                                                @PathVariable String mpName,
                                                @PathVariable String name, HttpServletRequest req) {
        LayerGroupInfo map = findMap(wsName, mpName);
        PublishedInfo layer = findMapLayer( map, name );
        int index = map.layers().indexOf(layer);
        boolean removed = map.getLayers().remove(layer);
        if( removed ){
            map.getStyles().remove(index);
            Catalog cat = geoServer.getCatalog();
            cat.save(map);
            JSONObj delete = new JSONObj()
                .put("name", layer.getName())
                .put("removed", removed );
            return delete;
        }
        String message = String.format("Unable to remove map layer %s/$s/%s",map.getWorkspace().getName(),map.getName(),name);
        throw new IllegalStateException(message);
    }
    /**
     * Confirm layer group matches composer definition of a Map.
     * @param map
     * @return true if layergroup can be handled by composer
     */
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

    /** Quick map description suitable for display in a list */
    JSONObj map(JSONObj obj, LayerGroupInfo map, String wsName) {
        obj.put("name", map.getName())
           .put("workspace", wsName)
           .put("title", map.getTitle())
           .put("description", map.getAbstract());
        ReferencedEnvelope bounds = map.getBounds();
        IO.proj(obj.putObject("proj"), bounds.getCoordinateReferenceSystem(), null);
        IO.bounds(obj.putObject("bbox"), bounds);
        obj.put("layer_count", map.getLayers().size());
        
        // List date map was last modified
        if( obj.has("modified") ){
            IO.metadata(obj, map);
        }
        else {
            // Generate metadata based on resource timestamp
            String path = Paths.path("workspaces", wsName, "layergroups",
                    String.format("%s.xml", map.getName()));
            GeoServerResourceLoader resourceLoader = geoServer.getCatalog().getResourceLoader();
            if( resourceLoader != null ){
                Resource r = resourceLoader.get(path);
                if (r != null && r.getType() == Type.RESOURCE) {
                    long modified = r.lastmodified();
                    IO.date(obj.putObject("modified"), new Date(modified));
                }
            }
        }
        return obj;
    }
    /** Complete map description suitable for editing. */
    JSONObj mapDetails(JSONObj obj, LayerGroupInfo map, String wsName, HttpServletRequest req) {
        map(obj,map,wsName);
        
        List<PublishedInfo> published = Lists.reverse(map.getLayers());
        JSONArr layers = obj.putArray("layers");
        for (PublishedInfo l : published) {
            layer( layers.addObject(), l, req);
        }
        return obj;
    }
    
    private JSONObj layer(JSONObj obj, PublishedInfo l, HttpServletRequest req) {
        if (l instanceof LayerInfo) {
            LayerInfo info = (LayerInfo) l;
            ResourceInfo r = info.getResource();
            String wsName = r.getNamespace().getPrefix();
            obj.put("workspace", wsName);
            obj.put("name", info.getName());
            obj.put("url",IO.url(req,"/layers/%s/%s",wsName,r.getName()));
            obj.put("title", IO.title(info));
            obj.put("description", IO.description(info));
            obj.put("type",IO.Type.of(info.getResource()).toString());
            StoreInfo store = r.getStore();
            obj.putObject("resource")
                .put("name",r.getNativeName())
                .put("workspace",wsName)
                .put("store",store.getName())
                    .put("url",
                         IO.url(req, "/stores/%s/%s/%s", wsName, store.getName(),r.getNativeName())
                );
        } else if (l instanceof LayerGroupInfo) {
            LayerGroupInfo group = (LayerGroupInfo) l;
            String wsName = group.getWorkspace().getName();
            obj.put("workspace", wsName);
            obj.put("name", group.getName());
            obj.put("url", IO.url(req,"/layers/%s/%s",wsName,group.getName()) );
            obj.put("title", group.getTitle());
            obj.put("description", group.getAbstract());
            obj.put("type", "map");
            obj.put("group", group.getMode().name());
            obj.put("layer_count", group.getLayers().size());
        }
        return obj;
    }
    
    private PublishedInfo findMapLayer( LayerGroupInfo map, String name ){
        List<PublishedInfo> layers = Lists.reverse(map.getLayers());
        if( name.matches("\\d+")){
            try {
                int index = Integer.parseInt(name);
                return layers.get(index);
            }
            catch(NumberFormatException ignore){
            }
            catch(IndexOutOfBoundsException ignore){
            }
        }
        else {
            for (PublishedInfo l : layers) {
                if( name.equals(l.getName())){
                    return l;
                }
            }
        }
        String message = String.format("Unable to locate map layer %s/$s/%s",map.getWorkspace().getName(),map.getName(),name);
        throw new NotFoundException(message);
    }

    LayerGroupInfo findMap(String wsName, String name) {
        Catalog cat = geoServer.getCatalog();
        LayerGroupInfo m = cat.getLayerGroupByName(wsName, name);
        if (m == null) {
            throw new NotFoundException(String.format("No such map %s:%s", wsName, name));
        }
        return m;
    }
    
    LayerInfo findLayer(String wsName, String name) {
        Catalog cat = geoServer.getCatalog();
        return wsName != null ? cat.getLayerByName(new NameImpl(wsName, name)) :
            cat.getLayerByName(name);
    }
    static class MapLayer {
        PublishedInfo layer;
        StyleInfo style;

        public MapLayer(PublishedInfo layer, StyleInfo style) {
            this.layer = layer;
            this.style = style;
        }
        
        @Override
        public int hashCode() {
            final int prime = 31;
            int result = 1;
            result = prime * result + ((layer == null) ? 0 : layer.getId().hashCode());
            result = prime * result + ((style == null) ? 0 : style.getId().hashCode());
            return result;
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj)
                return true;
            if (obj == null)
                return false;
            if (getClass() != obj.getClass())
                return false;
            MapLayer other = (MapLayer) obj;
            if (layer == null) {
                if (other.layer != null)
                    return false;
            } else if (!layer.getId().equals(other.layer.getId()))
                return false;
            if (style == null) {
                if (other.style != null)
                    return false;
            } else if (!style.getId().equals(other.style.getId()))
                return false;
            return true;
        }

        static List<MapLayer> list( LayerGroupInfo map ){
            List<StyleInfo> styles = map.getStyles();
            List<PublishedInfo> layers = map.getLayers();
            List<MapLayer> l = new ArrayList<MapLayer>();
            for (int i = 0; i < map.getLayers().size(); i++) {
                l.add(new MapLayer(layers.get(i),styles.get(i)));
            }
            return l;
        }
    }
}
