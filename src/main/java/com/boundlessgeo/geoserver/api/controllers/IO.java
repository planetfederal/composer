/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import static org.geoserver.catalog.Predicates.and;
import static org.geoserver.catalog.Predicates.equal;

import java.io.File;
import java.io.IOException;
import java.io.Serializable;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;
import java.util.Map.Entry;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.annotation.Nullable;
import javax.servlet.http.HttpServletRequest;

import com.boundlessgeo.geoserver.util.RecentObjectCache.Ref;

import org.apache.commons.lang.WordUtils;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.CoverageInfo;
import org.geoserver.catalog.CoverageStoreInfo;
import org.geoserver.catalog.DataStoreInfo;
import org.geoserver.catalog.FeatureTypeInfo;
import org.geoserver.catalog.Info;
import org.geoserver.catalog.LayerGroupInfo;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.NamespaceInfo;
import org.geoserver.catalog.PublishedInfo;
import org.geoserver.catalog.ResourceInfo;
import org.geoserver.catalog.ResourcePool;
import org.geoserver.catalog.StoreInfo;
import org.geoserver.catalog.WMSLayerInfo;
import org.geoserver.catalog.WMSStoreInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.catalog.util.CloseableIterator;
import org.geoserver.config.GeoServer;
import org.geoserver.config.GeoServerDataDirectory;
import org.geoserver.ows.URLMangler.URLType;
import org.geoserver.ows.util.ResponseUtils;
import org.geoserver.platform.GeoServerResourceLoader;
import org.geoserver.platform.resource.Files;
import org.geoserver.platform.resource.Paths;
import org.geotools.coverage.grid.io.AbstractGridFormat;
import org.geotools.coverage.grid.io.GridCoverage2DReader;
import org.geotools.data.DataAccess;
import org.geotools.data.DataAccessFactory;
import org.geotools.data.DataStore;
import org.geotools.data.DataAccessFactory.Param;
import org.geotools.data.ows.Layer;
import org.geotools.data.Parameter;
import org.geotools.feature.FeatureTypes;
import org.geotools.feature.NameImpl;
import org.geotools.filter.text.ecql.ECQL;
import org.geotools.filter.visitor.DuplicatingFilterVisitor;
import org.geotools.geometry.jts.Geometries;
import org.geotools.geometry.jts.ReferencedEnvelope;
import org.geotools.referencing.CRS;
import org.geotools.referencing.crs.DefaultGeographicCRS;
import org.geotools.resources.coverage.FeatureUtilities;
import org.geotools.util.Converters;
import org.geotools.util.NullProgressListener;
import org.geotools.util.logging.Logging;
import org.ocpsoft.pretty.time.PrettyTime;
import org.opengis.coverage.grid.Format;
import org.opengis.coverage.grid.GridCoverageReader;
import org.opengis.feature.simple.SimpleFeatureType;
import org.opengis.feature.type.AssociationDescriptor;
import org.opengis.feature.type.AttributeDescriptor;
import org.opengis.feature.type.FeatureType;
import org.opengis.feature.type.GeometryDescriptor;
import org.opengis.feature.type.Name;
import org.opengis.feature.type.PropertyDescriptor;
import org.opengis.feature.type.PropertyType;
import org.opengis.filter.Filter;
import org.opengis.filter.expression.PropertyName;
import org.opengis.referencing.FactoryException;
import org.opengis.referencing.ReferenceIdentifier;
import org.opengis.referencing.crs.CoordinateReferenceSystem;
import org.opengis.referencing.crs.GeographicCRS;
import org.opengis.referencing.crs.ProjectedCRS;
import org.opengis.referencing.operation.TransformException;
import org.opengis.util.GenericName;

import com.boundlessgeo.geoserver.Proj;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;
import com.google.common.base.Function;
import com.google.common.base.Throwables;
import com.google.common.collect.Iterables;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.Envelope;
import com.vividsolutions.jts.geom.Geometry;

/**
 * Helper for encoding/decoding objects to/from JSON.
 */
public class IO {

    static final String DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ssXXX";

    /** Kind of provider */
    static public enum Kind {FILE,DATABASE,WEB,GENERIC;
        public String toString() {
            return name().toLowerCase();
        }
        static Kind of( ResourceInfo resource){
            return of( resource.getStore());
        }
        static Kind of( DataAccessFactory format){
            Set<String> params = new HashSet<String>();
            for (Param info : format.getParametersInfo()) {
                params.add(info.getName());
            }
            if (params.contains("dbtype")) {
                return Kind.DATABASE;
            }
            if (params.contains("directory") || params.contains("file") || params.contains("raster")) {
                return Kind.FILE;
            }
            if (params.contains("wms")
                    || params.contains("WFSDataStoreFactory:GET_CAPABILITIES_URL")) {
                return Kind.WEB;
            }
            if( params.contains("url") ){
                return Kind.FILE;
            }
            return Kind.GENERIC;
        }
        static Kind of( StoreInfo store ){
            if( store instanceof CoverageStoreInfo){
                String url = ((CoverageStoreInfo)store).getURL();
                if( url.startsWith("file")){
                    return Kind.FILE;
                }
                else if( url.startsWith("http") ||
                         url.startsWith("https") ||
                         url.startsWith("ftp") ||
                         url.startsWith("sftp")){
                    return Kind.WEB;
                }
            }
            Map<String, Serializable> params = store.getConnectionParameters();
            if(params == null ){
                return Kind.GENERIC;
            }
            else if( params.containsKey("dbtype")){
                return Kind.DATABASE;
            }
            else if( store instanceof WMSStoreInfo){
                return Kind.WEB;
            }
            else if( params.keySet().contains("directory") ||
                params.keySet().contains("file") ){
                
                return Kind.FILE;
            }
            for( Object value : params.values()){
                if( value == null ) continue;
                if( value instanceof File ||
                    (value instanceof String && ((String)value).startsWith("file:")) ||
                    (value instanceof URL && ((URL)value).getProtocol().equals("file"))){
                    return Kind.FILE;
                }
                if( (value instanceof String && ((String)value).startsWith("http:")) ||
                    (value instanceof URL && ((URL)value).getProtocol().equals("http"))){
                    return Kind.WEB;
                }
                if( value instanceof String && ((String)value).startsWith("jdbc:")){
                    return Kind.DATABASE;
                }
            }
            return Kind.GENERIC;
        }
    }
    /** Type of content: raster, vector, service(wms layer), generic resource */
    static public enum Type {RASTER,VECTOR,SERVICE,RESOURCE;
        public String toString() {
            return name().toLowerCase();
        }
        static Type of( String resource ){
            return valueOf(resource.toUpperCase());
        }
        static Type of( ResourceInfo resource ){
            if( resource instanceof CoverageInfo){
                return Type.RASTER;
            }
            else if( resource instanceof FeatureTypeInfo){
                return Type.VECTOR;
            }
            else if(resource instanceof WMSLayerInfo){
                return Type.SERVICE;
            }
            return Type.RESOURCE;
        }
        static Type of( StoreInfo store ){
            if( store instanceof CoverageStoreInfo){
                return Type.RASTER;
            }
            else if( store instanceof DataStoreInfo){
                return Type.VECTOR;
            }
            else if(store instanceof WMSStoreInfo){
                return Type.SERVICE;
            }
            return Type.RESOURCE;
        }
    }

    static Logger LOG = Logging.getLogger(IO.class);

    /**
     * Encodes a projection within the specified object.
     *
     * @return The object passed in.
     */
    public static JSONObj proj(JSONObj obj, CoordinateReferenceSystem crs, String srs) {
        if (srs == null && crs != null) {
            try {
                srs = CRS.lookupIdentifier(crs, false);
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Unable to determine srs from crs: " + crs, e);
            }
        }
        
        if (crs != null && crs.getName() != null) {
            ReferenceIdentifier name = crs.getName();
            if (name instanceof GenericName) {
                obj.put("title", ((GenericName) name).tip().toString());
            } else {
                obj.put("title", name.toString());
            }
        }
        
        if (srs != null) {
            obj.put("srs", srs);
        }
        else {
            obj.put("srs", "UNKNOWN");
        }

        if (crs == null && srs != null) {
            try {
                crs = CRS.decode(srs);
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Unable to determine crs from srs: " + srs, e);
            }
        }

        if (crs != null) {
            // type
            obj.put("type",
                    crs instanceof ProjectedCRS ? "projected" : crs instanceof GeographicCRS ? "geographic" : "other");

            // units
            String units = null;
            try {
                // try to determine from actual crs
                String unit = crs.getCoordinateSystem().getAxis(0).getUnit().toString();
                if ("ft".equals(unit) || "feets".equals(unit))
                    units = "ft";
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Unable to determine units from crs", e);
            }
            if (units == null) {
                // fallback: meters for projected, otherwise degrees
                units = crs instanceof ProjectedCRS ? "m" : "degrees";
            }
            obj.put("unit", units);
            obj.put("wkt", crs.toWKT());
        }

        return obj;
    }

    /**
     * Encodes a bounding box within the specified object.
     *
     * @return The object passed in.
     */
    public static JSONObj bounds(JSONObj obj, Envelope bbox) {
        obj.put("west", bbox.getMinX())
            .put("south", bbox.getMinY())
            .put("east", bbox.getMaxX())
            .put("north", bbox.getMaxY());

        if (!bbox.isNull()) {
            Coordinate center = bbox.centre();
            obj.putArray("center").add(center.x).add(center.y);
        }

        return obj;
    }

    /**
     * Decodes a bounding box within the specified object.
     *
     * The parsed envelope.
     */
    public static Envelope bounds(JSONObj obj) {
        return new Envelope(obj.doub("west"), obj.doub("east"), obj.doub("south"), obj.doub("north"));
    }

    /**
     * Decodes a projection within the specified object.
     *
     * @return The parsed projection, or null.
     *
     * @throws java.lang.IllegalArgumentException If the object has no 'srs' property or there was an error decoding
     * the srs.
     */
    public static CoordinateReferenceSystem crs(JSONObj obj) throws Exception {
        return Proj.get().crs(srs(obj));
    }

    /**
     * Decodes am srs within the specified projection object.
     *
     * @param obj JSON object with same structure as produced by {@link #proj(JSONObj,CoordinateReferenceSystem, String)}.
     *
     * @return The srs.
     *
     * @throws java.lang.IllegalArgumentException If the object has no 'srs' property.
     */
    public static String srs(JSONObj obj) {
        String srs = obj.str("srs");
        if (srs == null) {
            throw new IllegalArgumentException("Projection must have an 'srs' property");
        }
        return srs;
    }

    /**
     * Encodes a workspace within the specified object.
     *
     * @param obj The object to encode within.
     * @param workspace The workspace to encode.
     * @param namespace The namespace corresponding to the workspace.
     * @param isDefault Flag indicating whether the workspace is the default.
     *
     * @return The object passed in.
     */
    public static JSONObj workspace(JSONObj obj, WorkspaceInfo workspace, NamespaceInfo namespace, boolean isDefault) {
        obj.put("name", workspace.getName());
        if (namespace != null) {
            obj.put("uri", namespace.getURI());
        }
        obj.put("default", isDefault);
        return metadata(obj, workspace);
    }
    
    /*
     * Layers API
     */
    
    static Object title(LayerInfo layer) {
        ResourceInfo r = layer.getResource();
        return layer.getTitle() != null ? layer.getTitle() : r != null ? r.getTitle() : null;
    }

    static Object description(LayerInfo layer) {
        ResourceInfo r = layer.getResource();
        return layer.getAbstract() != null ? layer.getAbstract() : r != null ? r.getAbstract() : null;
    }

    public static JSONObj layer(JSONObj json, LayerInfo info, HttpServletRequest req) {
        String wsName = info.getResource().getNamespace().getPrefix();
        json.put("name", info.getName())
            .put("workspace", wsName)
            .put("url", url(req,"/layers/%s/%s",
                    wsName,info.getName()) );
        return json;
    }
    
    public static JSONObj layerDetails(JSONObj obj, PublishedInfo layer, HttpServletRequest req) {
        if( layer == null ){
            return obj;
        }
        if( layer instanceof LayerInfo){
            return layerDetails( obj, (LayerInfo) layer, req );
        }
        else if ( layer instanceof LayerGroupInfo ){
            return layerDetails( obj, (LayerGroupInfo) layer, req );
        }
        else {
            return obj;
        }
    }
    
    public static JSONObj layerDetails(JSONObj obj, LayerGroupInfo group, HttpServletRequest req) {
        String wsName = group.getWorkspace().getName();
        obj.put("name", group.getName())
           .put("workspace", wsName)
           .put("url", url(req,"/maps/%s/%s",wsName,group.getName()) )
           .put("title", group.getTitle() )
           .put("description", group.getAbstract() )
           .put("type", "map" )
           .put("group", group.getMode().name());
        
        proj(obj.putObject("proj"), group.getBounds().getCoordinateReferenceSystem(), null);
        bbox(obj.putObject("bbox"), group);
        
        return obj;
    }
    /**
     * Encodes a layer within the specified object.
     *
     * @return The object passed in.
     */
    @SuppressWarnings("unchecked")
    public static JSONObj layerDetails(JSONObj obj, LayerInfo layer, HttpServletRequest req) {
        String wsName = layer.getResource().getNamespace().getPrefix();
        ResourceInfo r = layer.getResource();
        Type type = Type.of(r); //type(r);
        
        obj.put("name", layer.getName())
                .put("workspace", wsName)
                .put("title", title(layer))
                .put("description", description(layer))
                .put("type", type.toString());
        
        StoreInfo store = r.getStore();
        if( req != null ){
            obj.putObject("resource")
                .put("name",r.getName())
                .put("store",store.getName())
                .put("workspace",wsName)
                .put("url",
                     url(req, "/stores/%s/%s/%s",wsName, store.getName(),r.getName())
                );
        }
        
        JSONArr keywords = new JSONArr();
        keywords.raw().addAll( r.keywordValues() );
        obj.put("keywords", keywords);
        proj(obj.putObject("proj"), r.getCRS(), r.getSRS());
        bbox( obj.putObject("bbox"), r );
        
        if (r instanceof FeatureTypeInfo) {
            FeatureTypeInfo ft = (FeatureTypeInfo) r;
            FeatureType schema;
            try {
                schema = ft.getFeatureType();
                obj.put("geometry", geometry(layer));
                schema(obj.putObject("schema"), schema, true );
            } catch (IOException e) {
                LOG.log(Level.WARNING, "Error looking up schema "+ft.getNativeName(), e);
            }
        }
        else if( r instanceof CoverageInfo) {
            obj.put("geometry", geometry(layer));
            schemaGrid(obj.putObject("schema"), ((CoverageInfo)r), true );
        }
        else if( r instanceof WMSLayerInfo) {
            obj.put("geometry", geometry(layer));
        }
        return metadata(obj, layer);
    }

    static String type(ResourceInfo r)  {
        if (r instanceof CoverageInfo) {
            return "raster";
        }
        else if (r instanceof FeatureTypeInfo){
            return "vector";
        }
        else if (r instanceof WMSLayerInfo){
            return "wms";
        }
        else {
            return "resource";
        }
    }

    static String geometry(LayerInfo layer) {
        ResourceInfo r = layer.getResource();
        
        if (r instanceof FeatureTypeInfo) {
            GeometryDescriptor gd = null;
            FeatureTypeInfo ft = (FeatureTypeInfo)r;
            try {
                FeatureType schema = ft.getFeatureType();
                gd = schema.getGeometryDescriptor();
            } catch (IOException e) {
                LOG.log(Level.WARNING, "Error looking up schema "+ft.getNativeName(), e);
            }
            if (gd == null) {
                return "none";
            }
            @SuppressWarnings("unchecked")
            Geometries geomType = Geometries.getForBinding((Class<? extends Geometry>) gd.getType().getBinding());
            return geomType.getName();
        }
        if (r instanceof CoverageInfo) {
            return "raster";
        }
        if (r instanceof WMSLayerInfo) {
           return "layer";
        }
        return "none";
    }
    
    public static JSONObj bbox( JSONObj bbox, LayerGroupInfo l ){
        ReferencedEnvelope bounds = l.getBounds();
        if (bounds != null) {
            bounds(bbox.putObject("native"), bounds );
            
            try {
                ReferencedEnvelope latLonBounds = bounds.transform(DefaultGeographicCRS.WGS84, true);
                bounds(bbox.putObject("lonlat"), latLonBounds);
            } catch (TransformException e) {
            } catch (FactoryException e) {
            }
        }
        return bbox;
    }
    
    public static JSONObj bbox( JSONObj bbox, ResourceInfo r ){
        if (r.getNativeBoundingBox() != null) {
            bounds(bbox.putObject("native"), r.getNativeBoundingBox());
        }
        else {
            // check if the crs is geographic, if so use lat lon
            if (r.getCRS() instanceof GeographicCRS && r.getLatLonBoundingBox() != null) {
                bounds(bbox.putObject("native"), r.getLatLonBoundingBox());
            }
        }

        if (r.getLatLonBoundingBox() != null) {
            bounds(bbox.putObject("lonlat"), r.getLatLonBoundingBox());
        }
        else {
            if (r.getNativeCRS() instanceof GeographicCRS && r.getLatLonBoundingBox() != null) {
                bounds(bbox.putObject("lonlat"), r.getLatLonBoundingBox());
            }
        }
        return bbox;
    }
    
    public static JSONObj schema( JSONObj schema, FeatureType type, boolean details){
        if( type != null ){
            schema.put("name", type.getName().getLocalPart() );
            schema.put("namespace", type.getName().getNamespaceURI() );
            schema.put("simple", type instanceof SimpleFeatureType );
            JSONArr attributes = schema.putArray("attributes");
            for( PropertyDescriptor d : type.getDescriptors() ){
                PropertyType t = d.getType();
                final String NAME = d.getName().getLocalPart();
                String kind;
                if (d instanceof GeometryDescriptor){
                    kind = "geometry";
                }
                else if( d instanceof AttributeDescriptor){
                    kind = "attribute";
                }
                else if (d instanceof AssociationDescriptor){
                    kind = "association";
                }
                else {
                    kind = "property";
                }
                JSONObj property = attributes.addObject()
                    .put("name", NAME )
                    .put("property", kind )
                    .put("type", t.getBinding().getSimpleName() );
                
                if( d instanceof GeometryDescriptor){
                    GeometryDescriptor g = (GeometryDescriptor) d;                    
                    proj( property.putObject("proj"), g.getCoordinateReferenceSystem(), null );
                }

                if( details){
                    property
                        .put("namespace", d.getName().getNamespaceURI() )
                        .put("description", t.getDescription() )
                        .put("min-occurs",d.getMinOccurs() )
                        .put("max-occurs",d.getMaxOccurs() )
                        .put("nillable",d.isNillable());
                
                    int length = FeatureTypes.getFieldLength(d);
                    if( length != FeatureTypes.ANY_LENGTH ){
                        property.put("length", length );
                    }
                    
                    if( d instanceof AttributeDescriptor){
                        AttributeDescriptor a = (AttributeDescriptor) d;
                        property.put("default-value", a.getDefaultValue() );
                    }
                    if( !t.getRestrictions().isEmpty() ){
                        JSONArr validate = property.putArray("validate");
                        for( Filter f : t.getRestrictions() ){
                            String cql;
                            try {
                                Filter clean = (Filter) f.accept( new DuplicatingFilterVisitor(){
                                    public PropertyName visit(PropertyName e, Object extraData ){
                                        String n = e.getPropertyName();
                                        return getFactory(extraData).property(
                                                ".".equals(n) ? NAME : n,
                                                e.getNamespaceContext());
                                    }
                                }, null );
                                cql = ECQL.toCQL(clean);
                            }
                            catch (Throwable ignore ){
                                ignore.printStackTrace();
                                cql = f.toString();
                            }
                            validate.add( cql );
                        }                    
                    }
                }
            }
        }
        return schema;
    }
    
    /**
     * Generate schema for GridCoverageSchema (see {@link FeatureUtilities#wrapGridCoverage}).
     */
    public static JSONObj schemaGrid( JSONObj schema, CoverageInfo info, boolean details ){
        if( info != null ){
            CoordinateReferenceSystem crs = info.getCRS() != null
                    ? info.getCRS()
                    : info.getNativeCRS();
            schemaGrid( schema, crs, details );
        }
        return schema;
    }
    public static JSONObj schemaGrid( JSONObj schema, CoordinateReferenceSystem crs, boolean details){
        schema.put("name", "GridCoverage" );
        schema.put("simple", true );
        JSONArr attributes = schema.putArray("attributes");
        JSONObj geom = attributes.addObject()
            .put("name", "geom" )
            .put("property", "geometry" )
            .put("type", "Polygon" );

        if( crs != null ){
            proj( geom.putObject("proj"), crs, null );
        }
        
        if( details ){
            geom
                .put("min-occurs",0)
                .put("max-occurs",1)
                .put("nillable",true)
                .put("default-value",null);   
        
        }
        JSONObj grid = attributes.addObject()
            .put("name", "grid" )
            .put("property", "attribute" )
            .put("type", "grid" );
        
        if( details ){
            grid
                .put("binding", "GridCoverage" )
                .put("min-occurs",0)
                .put("max-occurs",1)
                .put("nillable",true)
                .put("default-value",null);
        }
        return schema;
    }
    
    private static PrettyTime PRETTY_TIME = new PrettyTime();
    
    /*
     * Stores API
     */
    
    public static JSONObj store(JSONObj obj, StoreInfo store, HttpServletRequest req, GeoServer geoServer) {       
        String name = store.getName();

        obj.put("name", name)
            .put("workspace", store.getWorkspace().getName())
            .put("enabled", store.isEnabled())
            .put("description", store.getDescription())
            .put("format", store.getType())
            .put("url", url(req,"/stores/%s/%s",store.getWorkspace().getName(), store.getName()) );
        
        String source = source(store, geoServer);
        obj.put("source", source )
           .put("type", Kind.of(store).name())
           .put("kind", Type.of(store).name());   

        return metadata(obj, store);
    }

    public static JSONObj storeDetails(JSONObj json, StoreInfo store, HttpServletRequest req, GeoServer geoServer) throws IOException {
        store(json, store, req, geoServer);

        JSONObj connection = new JSONObj();
        Map<String, Serializable> params = store.getConnectionParameters();
        for (Entry<String, Serializable> param : params.entrySet()) {
            String key = param.getKey();
            Object value = param.getValue();
            String text = value == null ? null : value.toString();
            
            connection.put( key, text );
        }
        if (store instanceof CoverageStoreInfo) {
            CoverageStoreInfo info = (CoverageStoreInfo) store;
            connection.put("raster", info.getURL());
        }
        if (store instanceof WMSStoreInfo) {
            WMSStoreInfo info = (WMSStoreInfo) store;
            json.put("wms", info.getCapabilitiesURL());
        }
        json.put("connection", connection );
        json.put("error", error( new JSONObj(), store.getError()));

        if (store.isEnabled()) {
            resources(store, json.putArray("resources"), geoServer);
        }
        json.put("layer-count",layerCount(store, geoServer));

        return json;
    }
    static int layerCount(StoreInfo store, GeoServer geoServer) throws IOException {
        Catalog cat = geoServer.getCatalog();
        WorkspaceInfo ws = store.getWorkspace();

        Filter filter = and(equal("store", store), equal("namespace.prefix", ws.getName()));
        int count=0;
        try (CloseableIterator<ResourceInfo> layers = cat.list(ResourceInfo.class, filter);) {
            while (layers.hasNext()) {
                ResourceInfo r = layers.next();
                for (LayerInfo l : cat.getLayers(r)) {
                    if (l != null) {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    private static JSONArr layers(ResourceInfo r, JSONArr list, GeoServer geoServer) throws IOException {
        if (r != null) {
            Catalog cat = geoServer.getCatalog();
            for (LayerInfo l : cat.getLayers(r)) {
                JSONObj obj = layerDetails(list.addObject(), l, null);
            }
        }
        return list;
    }
    
    private static JSONArr layers(StoreInfo store, JSONArr list, GeoServer geoServer) throws IOException {
        Catalog cat = geoServer.getCatalog();
        WorkspaceInfo ws = store.getWorkspace();

        Filter filter = and(equal("store", store), equal("namespace.prefix", ws.getName()));
        try (CloseableIterator<ResourceInfo> layers = cat.list(ResourceInfo.class, filter);) {
            while (layers.hasNext()) {
                ResourceInfo r = layers.next();
                for (LayerInfo l : cat.getLayers(r)) {
                    layerDetails(list.addObject(), l, null);
                }
            }
        }

        return list;
    }

    @SuppressWarnings("unchecked")
    private static JSONArr resources(StoreInfo store, JSONArr list, GeoServer geoServer) throws IOException {
        for (String resource : listResources(store)) {
            resource( list.addObject(), store, resource, geoServer);
        }
        return list;
    }
    
    public static JSONObj resource(JSONObj obj, StoreInfo store, String name, GeoServer geoServer) throws IOException {
        obj.put("name", name);
        if(store instanceof DataStoreInfo){
            DataStoreInfo data = (DataStoreInfo) store;
            
            @SuppressWarnings("rawtypes")
            DataAccess dataStore = data.getDataStore(new NullProgressListener());
            FeatureType schema;
            org.geotools.data.ResourceInfo info;
            if (dataStore instanceof DataStore) {
                schema = ((DataStore) dataStore).getSchema(name);
                info = ((DataStore) dataStore).getFeatureSource(name).getInfo();
            } else {
                NameImpl qname = new NameImpl(name);
                schema = dataStore.getSchema(qname);
                info = dataStore.getFeatureSource(qname).getInfo();
            }
            String title = info.getTitle() == null
                    ? WordUtils.capitalize(name)
                    : info.getTitle();
            String description = info.getDescription() == null ? "" : info.getDescription();
            obj.put("title", title);
            obj.put("description", description);
            
            JSONArr keywords = obj.putArray("keywords");
            keywords.raw().addAll( info.getKeywords() );
            bounds(obj.putObject("bounds"),info.getBounds());
            schema(obj.putObject("schema"), schema, false);
        }
        if(store instanceof CoverageStoreInfo){
            CoverageStoreInfo data = (CoverageStoreInfo) store;
            GridCoverageReader r = data.getGridCoverageReader(null, null);
            obj.put("title", WordUtils.capitalize(name));
            obj.put("description", "");
            if( r instanceof GridCoverage2DReader){
                GridCoverage2DReader reader = (GridCoverage2DReader) r;
                CoordinateReferenceSystem crs = reader.getCoordinateReferenceSystem(name);
                schemaGrid(obj.putObject("schema"), crs, false);
            }
            else {
                schemaGrid( obj.putObject("schema"), AbstractGridFormat.getDefaultCRS(), false);
            }
        }
        
        JSONArr layers = obj.putArray("layers");
        Catalog cat = geoServer.getCatalog();
        if (store instanceof CoverageStoreInfo) {
            // coverage store does not respect native name so we search by id
            for (CoverageInfo info : cat.getCoveragesByCoverageStore((CoverageStoreInfo) store)) {
                layers( info, layers, geoServer );
            }
        }
        else {
            Filter filter = and(equal("namespace.prefix", store.getWorkspace().getName()),equal("nativeName", name));
            try (
                CloseableIterator<ResourceInfo> published = cat.list(ResourceInfo.class, filter);
            ) {
                while (published.hasNext()) {
                    ResourceInfo info = published.next();
                    if (!info.getStore().getId().equals(store.getId())) {
                        continue; // native name is not enough, double check store id
                    }
                    layers( info, layers, geoServer );
                }
            }
        }
        return obj;
    }
    
    private static Iterable<String> listResources(StoreInfo store) throws IOException {
        if (store instanceof DataStoreInfo) {
            return Iterables.transform(((DataStoreInfo) store).getDataStore(null).getNames(),
                new Function<Name, String>() {
                    @Nullable
                    @Override
                    public String apply(@Nullable Name input) {
                        return input.getLocalPart();
                    }
                });
        }
        else if (store instanceof CoverageStoreInfo) {
            return Arrays.asList(((CoverageStoreInfo) store).getGridCoverageReader(null, null).getGridCoverageNames());
        }
        else if (store instanceof WMSStoreInfo) {
            return Iterables.transform(((WMSStoreInfo) store).getWebMapServer(null).getCapabilities().getLayerList(),
                new com.google.common.base.Function<Layer, String>() {
                    @Nullable
                    @Override
                    public String apply(@Nullable Layer input) {
                        return input.getName();
                    }
                });
        }

        throw new IllegalStateException("Unrecognized store type");
    }

    private static String source(StoreInfo store, GeoServer geoServer) {
        GeoServerResourceLoader resourceLoader = geoServer.getCatalog().getResourceLoader();
        GeoServerDataDirectory dataDir = new GeoServerDataDirectory(resourceLoader);
        if( store instanceof CoverageStoreInfo ){
            CoverageStoreInfo coverage = (CoverageStoreInfo) store;
            return sourceURL( coverage.getURL(), dataDir );
        }
        Map<String, Serializable> params =
                ResourcePool.getParams( store.getConnectionParameters(), resourceLoader );
        if( params.containsKey("dbtype")){
            // See JDBCDataStoreFactory for details
            String host = Converters.convert(params.get("host"),  String.class);
            String port = Converters.convert(params.get("port"),  String.class);
            String dbtype = Converters.convert(params.get("dbtype"),  String.class);
            String schema = Converters.convert(params.get("schema"),  String.class);
            String database = Converters.convert(params.get("database"),  String.class);
            StringBuilder source = new StringBuilder();
            source.append(host);
            if( port != null ){
                source.append(':').append(port);
            }
            source.append('/').append(dbtype).append('/').append(database);
            if( schema != null ){
                source.append('/').append(schema);
            }
            return source.toString();
        }
        else if( store instanceof WMSStoreInfo){
            String url = ((WMSStoreInfo)store).getCapabilitiesURL();
            return url;
        }
        else if( params.keySet().contains("directory")){
            String directory = Converters.convert(params.get("directory"),String.class);
            return sourceFile( directory, dataDir );
        }
        else if( params.keySet().contains("file")){
            String file = Converters.convert(params.get("file"),String.class);
            return sourceFile( file, dataDir );
        }
        if( params.containsKey("url")){
            String url = Converters.convert(params.get("url"),String.class);
            return sourceURL( url, dataDir );
        }
        for( Object value : params.values() ){
            if( value instanceof URL ){
                return source( (URL) value, dataDir );
            }
            if( value instanceof File ){
                return source( (File) value, dataDir );
            }
            if( value instanceof String ){
                String text = (String) value;
                if( text.startsWith("file:")){
                    return sourceURL( text, dataDir );
                }
                else if ( text.startsWith("http:") || text.startsWith("https:") || text.startsWith("ftp:")){
                    return text;
                }
            }
        }
        return "undertermined";
    }
    
    private static String source(File file, GeoServerDataDirectory dataDir) {
        File baseDirectory = dataDir.getResourceLoader().getBaseDirectory();
        return file.isAbsolute() ? file.toString() : Paths.convert(baseDirectory,file);
    }

    private static String source(URL url, GeoServerDataDirectory dataDir) {
        File baseDirectory = dataDir.getResourceLoader().getBaseDirectory();
        
        if (url.getProtocol().equals("file")) {
            File file = Files.url(baseDirectory, url.toExternalForm());
            if (file != null && !file.isAbsolute()) {
                return Paths.convert(baseDirectory, file); 
            }
        }
        return url.toExternalForm();
    }

    private static String sourceURL(String url, GeoServerDataDirectory dataDir) {
        File baseDirectory = dataDir.getResourceLoader().getBaseDirectory();

        File file = Files.url(baseDirectory, url);
        if( file != null ){
            return Paths.convert(baseDirectory, file); 
        }
        return url;
    }

    private static String sourceFile(String file, GeoServerDataDirectory dataDir) {
        File baseDirectory = dataDir.getResourceLoader().getBaseDirectory();

        File f = new File( file );
        return f.isAbsolute() ? file : Paths.convert(baseDirectory, f);
    }
    
    /*
     * Basic JSON Utilities
     */

    static JSONObj date(JSONObj obj, Date date) {
        String timestamp = new SimpleDateFormat(DATE_FORMAT).format(date);
        return obj.put("timestamp", timestamp).put("pretty", PRETTY_TIME.format(date));
    }

    /** Metadata: created and modified */
    static JSONObj metadata(JSONObj obj, Info i) {
        Date created = Metadata.created(i);
        if (created != null) {
            date(obj.putObject("created"), created);
        }
        Date modified = Metadata.modified(i);
        if (modified != null) {
            date(obj.putObject("modified"), modified);
        }
        return obj;
    }

    public static JSONObj error(JSONObj json, Throwable error) {
        if (error != null) {
            String message = null;
            JSONArr cause = new JSONArr();
            for (Throwable t : Throwables.getCausalChain(error)) {
                if (message == null && t.getMessage() != null) {
                    message = t.getMessage();
                }
                StringBuilder trace = new StringBuilder();
                for( StackTraceElement e : t.getStackTrace()){
                    trace.append( e.toString()).append('\n');
                }
                cause.addObject()
                    .put("exception", t.getClass().getSimpleName())
                    .put("message", t.getMessage())
                    .put("trace",trace.toString());
            }
            if (message == null) {
                message = error.getClass().getSimpleName();
            }
            json.put("message", message != null ? message : error.toString())
                .put("cause", cause)
                .put("trace",Throwables.getStackTraceAsString(error));
        }
        return json;
    }
    
    public static JSONObj param(JSONObj json, Parameter<?> p) {
        if (p != null) {
            String title = p.getTitle() != null ? p.getTitle().toString() : WordUtils.capitalize(p.getName());
            String description = p.getDescription() != null ? p.getDescription().toString() : null;

            JSONObj def = json.putObject(p.getName());
            def.put("title", title)
                .put("description",  description)
                .put("type", p.getType().getSimpleName())
                .put("default", safeValue(p.getDefaultValue()))
                .put("level", p.getLevel())
                .put("required", p.isRequired());
            
            if( !(p.getMinOccurs() == 1 && p.getMaxOccurs() == 1)){
                def.putArray("occurs")
                    .add( p.getMinOccurs())
                    .add(p.getMaxOccurs());
            }

            
            if (p.metadata != null) {
                for (String key : p.metadata.keySet()) {
                    if (Parameter.LEVEL.equals(key)) {
                        continue;
                    }
                    def.put(key, p.metadata.get(key));
                }
            }
        }
        return json;
    }
    public static void param(JSONObj json, Format g) {
        json.put("name","raster")
            .put("title","URL")
            .put("description",g.getDescription())
            .put("type",URL.class.getSimpleName())
            .put("default",null)
            .put("level","user")
            .put("required",true);
    }

    static private Object safeValue(Object value) {
        if(value == null){
            return null;
        }
        if (value instanceof String || value instanceof Number || value instanceof Boolean) {
            return value;
        }
        if (value instanceof java.util.TimeZone) {
            TimeZone zone = (TimeZone) value;
            return zone.getDisplayName();
        }
        return value.toString();
    }

    public static Object url(HttpServletRequest req, String path, Object ... args) {
        if (req == null) {
            return null;
        }
        String baseURL = ResponseUtils.baseURL(req);
        String relative = String.format("/api"+path, args );
        String resolved = ResponseUtils.buildURL(baseURL, relative, null, URLType.SERVICE);
        return resolved;
    }

    public static JSONObj ref(JSONObj obj, Ref ref) {
        obj.put("name", ref.name);
        if (ref.workspace != null) {
            obj.put("workspace", ref.workspace);
        }
        date(obj.putObject("modified"), ref.modified);
        return obj;
    }
    
    
}
