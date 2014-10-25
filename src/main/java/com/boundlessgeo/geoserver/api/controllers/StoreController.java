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
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.annotation.Nullable;
import javax.servlet.http.HttpServletRequest;

import org.apache.commons.lang.WordUtils;
import org.geoserver.catalog.CascadeDeleteVisitor;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.CatalogFactory;
import org.geoserver.catalog.CoverageInfo;
import org.geoserver.catalog.CoverageStoreInfo;
import org.geoserver.catalog.DataStoreInfo;
import org.geoserver.catalog.FeatureTypeInfo;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.ResourceInfo;
import org.geoserver.catalog.ResourcePool;
import org.geoserver.catalog.StoreInfo;
import org.geoserver.catalog.WMSStoreInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.catalog.util.CloseableIterator;
import org.geoserver.config.GeoServer;
import org.geoserver.platform.GeoServerResourceLoader;
import org.geoserver.platform.resource.Files;
import org.geoserver.platform.resource.Paths;
import org.geotools.coverage.grid.io.AbstractGridFormat;
import org.geotools.coverage.grid.io.GridCoverage2DReader;
import org.geotools.data.DataAccess;
import org.geotools.data.DataAccessFinder;
import org.geotools.data.DataStore;
import org.geotools.data.ows.Layer;
import org.geotools.data.wms.WebMapServer;
import org.geotools.feature.NameImpl;
import org.geotools.util.Converters;
import org.geotools.util.NullProgressListener;
import org.geotools.util.logging.Logging;
import org.opengis.coverage.grid.Format;
import org.opengis.coverage.grid.GridCoverageReader;
import org.opengis.feature.type.FeatureType;
import org.opengis.feature.type.Name;
import org.opengis.filter.Filter;
import org.opengis.referencing.crs.CoordinateReferenceSystem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;
import com.google.common.base.Function;
import com.google.common.collect.Iterables;

/**
 * Used to connect to data storage (file, database, or service).
 * <p>
 * This API is locked down for map composer and is (not intended to be stable between releases).</p>
 * 
 * @see <a href="https://github.com/boundlessgeo/suite/wiki/Stores-API">Store API</a> (Wiki)
 */
 @Controller
 @RequestMapping("/api/stores")
 public class StoreController extends ApiController {
     static Logger LOG = Logging.getLogger(StoreController.class);

    @Autowired
    public StoreController(GeoServer geoServer) {
        super(geoServer);
    }

    @RequestMapping(value = "/{wsName}", method = RequestMethod.GET)
    public @ResponseBody
    JSONArr list(@PathVariable String wsName){
        JSONArr arr = new JSONArr();
        Catalog cat = geoServer.getCatalog();
        for (StoreInfo store : cat.getStoresByWorkspace(wsName, StoreInfo.class)) {
            store(arr.addObject(), store);
        }
        return arr;
    }
    
    @RequestMapping(value = "/{wsName}/{name}", method = RequestMethod.GET)
    public @ResponseBody
    JSONObj get(@PathVariable String wsName, @PathVariable String name) {
        StoreInfo store = findStore(wsName, name, geoServer.getCatalog());
        if (store == null) {
            throw new IllegalArgumentException("Store " + wsName + ":" + name + " not found");
        }
        try {
            return storeDetails(new JSONObj(), store);
        } catch (IOException e) {
            throw new RuntimeException(String.format("Error occured accessing store: %s,%s",wsName, name), e);
        }
    }
    
    @RequestMapping(value = "/{wsName}/{name}", method = RequestMethod.DELETE)
    public @ResponseBody
    JSONObj delete(@PathVariable String wsName, @PathVariable String name, HttpServletRequest req) {
        boolean recurse = "true".equals(req.getParameter("recurse"));
        StoreInfo store = findStore(wsName, name, geoServer.getCatalog());
        Catalog cat = geoServer.getCatalog();
        
        List<ResourceInfo> layers = cat.getResourcesByStore(store, ResourceInfo.class );
        if( layers.isEmpty() ){
            cat.remove(store);
        }
        else if (recurse){
            CascadeDeleteVisitor delete = new CascadeDeleteVisitor(cat);
            if( store instanceof DataStoreInfo){
                delete.visit((DataStoreInfo)store);
            }
            else if( store instanceof CoverageStoreInfo){
                delete.visit((CoverageStoreInfo)store);
            }
            else if( store instanceof WMSStoreInfo){
                delete.visit((WMSStoreInfo)store);
            }
            else {
                throw new IllegalStateException( "Unable to delete "+name+" - expected data store, coverage store or wms store" );
            }
        }
        else {
            StringBuilder message = new StringBuilder();
            message.append("Use recurse=true to remove ").append(name).append(" along with layers:");
            for( ResourceInfo l : layers ){
                message.append(' ').append(l.getName());
            }
            throw new IllegalStateException( message.toString() );
        }
        JSONObj json = new JSONObj();
        json.put("name", name  )
            .put("workspace", wsName  );
        return json;
    }
    
    @SuppressWarnings({ "rawtypes", "unchecked" })
    @RequestMapping(value = "/{wsName}/{name}", method = RequestMethod.POST)
    public @ResponseBody
    JSONObj create(@PathVariable String wsName, @PathVariable String name, @RequestBody JSONObj obj) throws IOException {
        Catalog cat = geoServer.getCatalog();
        CatalogFactory factory = cat.getFactory();
        
        WorkspaceInfo workspace = findWorkspace(wsName);
        StoreInfo store = null;
        
        JSONObj params = obj.object("connection");
        if( params == null ){
            throw new IllegalArgumentException("connection parameters required");
        }
        if( params.has("raster")){
            String url = params.str("raster");            
            CoverageStoreInfo info = factory.createCoverageStore();
            info.setWorkspace(workspace);
            info.setType(name);
            
            // connect and defaults
            info.setURL(url);
            info.setType(obj.str("type"));
            try {
                GridCoverageReader reader = info.getGridCoverageReader(null, null);
                Format format = reader.getFormat();
                info.setDescription( format.getDescription() );
                info.setEnabled(true);
            } catch (IOException e) {
                info.setError(e);
                info.setEnabled(false);
            }
            store = info;
        }
        else if ( params.has("url") &&
                params.str("url").toLowerCase().contains("Service=WMS") &&
                params.str("url").startsWith("http")){
            WMSStoreInfo info = factory.createWebMapServer();
            info.setWorkspace(workspace);
            info.setType(name);
            
            // connect and defaults
            info.setCapabilitiesURL(params.str("url"));
            try {
                WebMapServer service = info.getWebMapServer(new NullProgressListener());
                info.setDescription( service.getInfo().getDescription() );
                info.setEnabled(true);
            } catch (Throwable e) {
                info.setError(e);
                info.setEnabled(false);
            }
            store = info;
        }
        else {
            HashMap map = new HashMap(params.raw());
            Map resolved = ResourcePool.getParams(map, cat.getResourceLoader() );
            DataAccess dataStore = DataAccessFinder.getDataStore(resolved);            
            if( dataStore == null ){
                throw new IllegalArgumentException("Connection parameters incomplete (does not match an available data store, coverage store or wms store).");
            }
            DataStoreInfo info = factory.createDataStore();
            info.setWorkspace(workspace);
            info.setType(name);
            info.getConnectionParameters().putAll(map);
            try {
                info.setDescription( dataStore.getInfo().getDescription());
                info.setEnabled(true);
            } catch (Throwable e) {
                info.setError(e);
                info.setEnabled(false);
            }
            store = info;
        }        
        boolean refresh = define( store, obj );
        if( refresh ){
            LOG.log( Level.FINE, "Inconsistent: default connection used for store creation required refresh");
        }
        cat.add(store);
        
        return storeDetails(new JSONObj(), store);
    }
    @RequestMapping(value="/{wsName}/{name}", method = RequestMethod.PATCH)
    public @ResponseBody JSONObj patch(@PathVariable String wsName, @PathVariable String name, @RequestBody JSONObj obj) throws IOException {
        Catalog cat = geoServer.getCatalog();
        StoreInfo store = cat.getStoreByName(wsName, name, StoreInfo.class );
        
        boolean refresh = define(store, obj);
        cat.save(store);
        if (refresh) {
            resetConnection(store);
        }
        return storeDetails(new JSONObj(), store);
    }
    
    private void resetConnection(StoreInfo store ){
        Catalog cat = geoServer.getCatalog();
        if (store instanceof CoverageStoreInfo) {
            cat.getResourcePool().clear((CoverageStoreInfo) store);
        } else if (store instanceof DataStoreInfo) {
            cat.getResourcePool().clear((DataStoreInfo) store);
        } else if (store instanceof WMSStoreInfo) {
            cat.getResourcePool().clear((WMSStoreInfo) store);
        }
    }
    
    @RequestMapping(value="/{wsName}/{name}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE)
    public @ResponseBody JSONObj put(@PathVariable String wsName, @PathVariable String name, @RequestBody JSONObj obj) throws IOException {
        Catalog cat = geoServer.getCatalog();
        StoreInfo store = cat.getStoreByName(wsName, name, StoreInfo.class );
        
        // pending: clear store to defaults
        boolean refresh = define( store, obj );
        cat.save( store );
        if (refresh) {
            resetConnection(store);
        }
        return storeDetails(new JSONObj(), store);
    }
    
    @SuppressWarnings("unchecked")
    private boolean define( StoreInfo store, JSONObj obj ){
        boolean reconnect = false;
        for( String prop : obj.keys()){
            if("description".equals(prop)){
                store.setDescription(obj.str(prop));
            }
            else if("enabled".equals(prop)){
                store.setEnabled(obj.bool(prop));
                reconnect = true;
            }
            else if("name".equals(prop)){
                store.setName(obj.str(prop));
            }
            else if("workspace".equals(prop)){
                WorkspaceInfo newWorkspace = findWorkspace(obj.str(prop));
                store.setWorkspace( newWorkspace );
            }
            else if( store instanceof CoverageStoreInfo){
                CoverageStoreInfo info = (CoverageStoreInfo) store;
                if("connection".equals(prop)){
                    JSONObj connection = obj.object(prop);
                    if(!connection.has("raster") && connection.str("raster") != null){
                        throw new IllegalArgumentException("Property connection.raster required for coverage store");
                    }
                    for( String param : connection.keys()){
                        if("raster".equals(param)){
                            String url = connection.str(param);
                            reconnect = reconnect || url == null || !url.equals(info.getURL());
                            info.setURL(url);
                        }
                    }
                }
            }
            else if( store instanceof WMSStoreInfo){
                WMSStoreInfo info = (WMSStoreInfo) store;
                if("connection".equals(prop)){
                    JSONObj connection = obj.object(prop);
                    if(!connection.has("url") && connection.str("url") != null){
                        throw new IllegalArgumentException("Property connection.url required for wms store");
                    }
                    for( String param : connection.keys()){
                        if("url".equals(param)){
                            String url = connection.str(param);
                            reconnect = reconnect || url == null || !url.equals(info.getCapabilitiesURL()); 
                            info.setCapabilitiesURL(url);
                        }
                    }
                }
            }
            if( store instanceof DataStoreInfo){
                DataStoreInfo info = (DataStoreInfo) store;
                if("connection".equals(prop)){
                    JSONObj connection = obj.object(prop);
                    info.getConnectionParameters().clear();
                    info.getConnectionParameters().putAll( connection.raw() );
                    reconnect = true;
                }
            }
        }
        
        return reconnect;
    }
    
    private JSONObj store(JSONObj obj, StoreInfo store) {       
        String name = store.getName();

        obj.put("name", name)
            .put("workspace", store.getWorkspace().getName())
            .put("enabled", store.isEnabled())
            .put("description", store.getDescription())
            .put("format", store.getType());
        
        String source = source(store);
        obj.put("source", source )
           .put("type", IO.Type.of(store).name())
           .put("kind", IO.Kind.of(store).name());   

        return IO.metadata(obj, store);
    }

    private JSONObj storeDetails(JSONObj json, StoreInfo store) throws IOException {
        store(json, store);

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
        json.put("error", IO.error( new JSONObj(), store.getError()));

        if (store.isEnabled()) {
            resources(store, json.putArray("resources"));
        }
        json.put("layer-count",layerCount(store));

        return json;
    }
    int layerCount(StoreInfo store) throws IOException {
        Catalog cat = geoServer.getCatalog();
        WorkspaceInfo ws = store.getWorkspace();

        Filter filter = and(equal("store", store), equal("namespace.prefix", ws.getName()));
        int count=0;
        try (CloseableIterator<ResourceInfo> layers = cat.list(ResourceInfo.class, filter);) {
            while (layers.hasNext()) {
                ResourceInfo r = layers.next();
                for (LayerInfo l : cat.getLayers(r)) {
                    count++;
                }
            }
        }
        return count;
    }

    private JSONArr layers(ResourceInfo r, JSONArr list) throws IOException {
        if (r != null) {
            Catalog cat = geoServer.getCatalog();
            for (LayerInfo l : cat.getLayers(r)) {
                layer(list.addObject(), l, true);
            }
        }
        return list;
    }
    
    private JSONArr layers(StoreInfo store, JSONArr list) throws IOException {
        Catalog cat = geoServer.getCatalog();
        WorkspaceInfo ws = store.getWorkspace();

        Filter filter = and(equal("store", store), equal("namespace.prefix", ws.getName()));
        try (CloseableIterator<ResourceInfo> layers = cat.list(ResourceInfo.class, filter);) {
            while (layers.hasNext()) {
                ResourceInfo r = layers.next();
                for (LayerInfo l : cat.getLayers(r)) {
                    layer(list.addObject(), l,true);
                }
            }
        }

        return list;
    }

    @SuppressWarnings("unchecked")
    private JSONArr resources(StoreInfo store, JSONArr list) throws IOException {
        Catalog cat = geoServer.getCatalog();
        WorkspaceInfo ws = store.getWorkspace();

        for (String resource : listResources(store)) {
            JSONObj obj = list.addObject();
            obj.put("name", resource);
            if(store instanceof DataStoreInfo){
                DataStoreInfo data = (DataStoreInfo) store;
                
                @SuppressWarnings("rawtypes")
                DataAccess dataStore = data.getDataStore(new NullProgressListener());
                FeatureType schema;
                org.geotools.data.ResourceInfo info;
                if (dataStore instanceof DataStore) {
                    schema = ((DataStore) dataStore).getSchema(resource);
                    info = ((DataStore) dataStore).getFeatureSource(resource).getInfo();
                } else {
                    NameImpl name = new NameImpl(resource);
                    schema = dataStore.getSchema(name);
                    info = dataStore.getFeatureSource(name).getInfo();
                }
                String title = info.getTitle() == null
                        ? WordUtils.capitalize(resource)
                        : info.getTitle();
                String description = info.getDescription() == null ? "" : info.getDescription();
                obj.put("title", title);
                obj.put("description", description);
                
                JSONArr keywords = obj.putArray("keywords");
                keywords.raw().addAll( info.getKeywords() );
                IO.bounds(obj.putObject("bounds"),info.getBounds());
                IO.schema(obj.putObject("schema"), schema, false);
            }
            if(store instanceof CoverageStoreInfo){
                CoverageStoreInfo data = (CoverageStoreInfo) store;
                GridCoverageReader r = data.getGridCoverageReader(null, null);
                obj.put("title", WordUtils.capitalize(resource));
                obj.put("description", "");
                if( r instanceof GridCoverage2DReader){
                    GridCoverage2DReader reader = (GridCoverage2DReader) r;
                    CoordinateReferenceSystem crs = reader.getCoordinateReferenceSystem(resource);
                    IO.schemaGrid(obj.putObject("schema"), crs, false);
                }
                else {
                    IO.schemaGrid( obj.putObject("schema"), AbstractGridFormat.getDefaultCRS(), false);
                }
            }
            
            JSONArr layers = obj.putArray("layers");
            if (store instanceof CoverageStoreInfo) {
                // coverage store does not respect native name so we search by id
                for (CoverageInfo info : cat.getCoveragesByCoverageStore((CoverageStoreInfo) store)) {
                    layers( info, layers );
                }
            }
            else {
                Filter filter = and(equal("namespace.prefix", ws.getName()),equal("nativeName", resource));
                try (
                    CloseableIterator<ResourceInfo> published = cat.list(ResourceInfo.class, filter);
                ) {
                    while (published.hasNext()) {
                        ResourceInfo info = published.next();
                        if (!info.getStore().getId().equals(store.getId())) {
                            continue; // native name is not enough, double check store id
                        }
                        layers( info, layers );
                    }
                }
            }
        }
        return list;
    }
    
    private JSONObj resource( JSONObj json, ResourceInfo info, boolean details){
        json.put("name", info.getName())
            .put("workspace", info.getStore().getWorkspace().getName() );
        if( details ){
            if (info instanceof FeatureTypeInfo) {
                FeatureTypeInfo data = (FeatureTypeInfo) info;
                try {
                    IO.schema(json.putObject("schema"), data.getFeatureType(),false);
                } catch (IOException e) {
                }
            }
           else if (info instanceof CoverageInfo ){
               CoverageInfo data = (CoverageInfo) info;
               IO.schemaGrid(json.putObject("schema"),data,false); 
           }
        }
        return json;
    }

    private JSONObj layer(JSONObj json, LayerInfo info, boolean details) {
        if (details) {
            IO.layer(json, info);
        } else {
            json.put("name", info.getName()).put("workspace",
                    info.getResource().getStore().getWorkspace().getName());
        }
        return json;
    }

    private Iterable<String> listResources(StoreInfo store) throws IOException {
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
                new Function<Layer, String>() {
                    @Nullable
                    @Override
                    public String apply(@Nullable Layer input) {
                        return input.getName();
                    }
                });
        }

        throw new IllegalStateException("Unrecognized store type");
    }

    private String source(StoreInfo store) {
        if( store instanceof CoverageStoreInfo ){
            CoverageStoreInfo coverage = (CoverageStoreInfo) store;
            return sourceURL( coverage.getURL() );
        }
        GeoServerResourceLoader resourceLoader = geoServer.getCatalog().getResourceLoader();
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
            return sourceFile( directory );
        }
        else if( params.keySet().contains("file")){
            String file = Converters.convert(params.get("file"),String.class);
            return sourceFile( file );
        }
        if( params.containsKey("url")){
            String url = Converters.convert(params.get("url"),String.class);
            return sourceURL( url );
        }
        for( Object value : params.values() ){
            if( value instanceof URL ){
                return source( (URL) value );
            }
            if( value instanceof File ){
                return source( (File) value );
            }
            if( value instanceof String ){
                String text = (String) value;
                if( text.startsWith("file:")){
                    return sourceURL( text );
                }
                else if ( text.startsWith("http:") || text.startsWith("https:") || text.startsWith("ftp:")){
                    return text;
                }
            }
        }
        return "undertermined";
    }
    
    private String source(File file) {
        File baseDirectory = dataDir().getResourceLoader().getBaseDirectory();
        return file.isAbsolute() ? file.toString() : Paths.convert(baseDirectory,file);
    }

    private String source(URL url) {
        File baseDirectory = dataDir().getResourceLoader().getBaseDirectory();
        
        if (url.getProtocol().equals("file")) {
            File file = Files.url(baseDirectory, url.toExternalForm());
            if (file != null && !file.isAbsolute()) {
                return Paths.convert(baseDirectory, file); 
            }
        }
        return url.toExternalForm();
    }

    private String sourceURL(String url) {
        File baseDirectory = dataDir().getResourceLoader().getBaseDirectory();

        File file = Files.url(baseDirectory, url);
        if( file != null ){
            return Paths.convert(baseDirectory, file); 
        }
        return url;
    }

    private String sourceFile(String file) {
        File baseDirectory = dataDir().getResourceLoader().getBaseDirectory();

        File f = new File( file );
        return f.isAbsolute() ? file : Paths.convert(baseDirectory, f);
    }

    private WorkspaceInfo findWorkspace(String wsName) {
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
 }
