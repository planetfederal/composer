/* (c) 2014-2015 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletRequest;

import org.geoserver.catalog.CascadeDeleteVisitor;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.CatalogFactory;
import org.geoserver.catalog.CoverageStoreInfo;
import org.geoserver.catalog.DataStoreInfo;
import org.geoserver.catalog.ResourceInfo;
import org.geoserver.catalog.ResourcePool;
import org.geoserver.catalog.StoreInfo;
import org.geoserver.catalog.WMSStoreInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.config.GeoServer;
import org.geotools.data.DataAccess;
import org.geotools.data.DataAccessFinder;
import org.geotools.data.wms.WebMapServer;
import org.geotools.util.NullProgressListener;
import org.geotools.util.logging.Logging;
import org.opengis.coverage.grid.Format;
import org.opengis.coverage.grid.GridCoverageReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;

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
    JSONArr list(@PathVariable String wsName, HttpServletRequest req){
        JSONArr arr = new JSONArr();
        Catalog cat = geoServer.getCatalog();
        for (StoreInfo store : cat.getStoresByWorkspace(wsName, StoreInfo.class)) {
            IO.store(arr.addObject(), store, req, geoServer);
        }
        return arr;
    }
    
    @RequestMapping(value = "/{wsName}/{name}", method = RequestMethod.GET)
    public @ResponseBody
    JSONObj get(@PathVariable String wsName, @PathVariable String name, HttpServletRequest req) {
        StoreInfo store = findStore(wsName, name, geoServer.getCatalog());
        if (store == null) {
            throw new IllegalArgumentException("Store " + wsName + ":" + name + " not found");
        }
        try {
            return IO.storeDetails(new JSONObj(), store, req, geoServer);
        } catch (IOException e) {
            throw new RuntimeException(String.format("Error occured accessing store: %s,%s",wsName, name), e);
        }
    }

    @RequestMapping(value = "/{wsName}/{stName}/{name}", method = RequestMethod.GET)
    public @ResponseBody JSONObj resource(@PathVariable String wsName, @PathVariable String stName, @PathVariable String name, HttpServletRequest req) throws IOException {
        Catalog cat = geoServer.getCatalog();
        StoreInfo store = findStore(wsName, stName, cat );
        JSONObj obj = IO.resource( new JSONObj(), store, name, geoServer);
        obj.putObject("store")
            .put("name", stName )
            .put("url", IO.url(req, "/stores/%s/%s",wsName,stName));
        return obj;
    }
    
    @RequestMapping(value = "/{wsName}/{name}", method = RequestMethod.DELETE)
    public @ResponseBody
    JSONObj delete(@PathVariable String wsName,
                   @PathVariable String name,
                   @RequestParam(value="recurse",defaultValue="false") boolean recurse,
                   HttpServletRequest req) {
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
    JSONObj create(@PathVariable String wsName, @PathVariable String name, @RequestBody JSONObj obj, HttpServletRequest req) throws IOException {
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
        
        return IO.storeDetails(new JSONObj(), store, req, geoServer);
    }
    @RequestMapping(value="/{wsName}/{name}", method = RequestMethod.PATCH)
    public @ResponseBody JSONObj patch(@PathVariable String wsName, @PathVariable String name, @RequestBody JSONObj obj, HttpServletRequest req) throws IOException {
        Catalog cat = geoServer.getCatalog();
        StoreInfo store = cat.getStoreByName(wsName, name, StoreInfo.class );
        
        boolean refresh = define(store, obj);
        cat.save(store);
        if (refresh) {
            resetConnection(store);
        }
        return IO.storeDetails(new JSONObj(), store, req, geoServer);
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
    public @ResponseBody JSONObj put(@PathVariable String wsName, @PathVariable String name, @RequestBody JSONObj obj, HttpServletRequest req) throws IOException {
        Catalog cat = geoServer.getCatalog();
        StoreInfo store = cat.getStoreByName(wsName, name, StoreInfo.class );
        
        // pending: clear store to defaults
        boolean refresh = define( store, obj );
        cat.save( store );
        if (refresh) {
            resetConnection(store);
        }
        return IO.storeDetails(new JSONObj(), store, req, geoServer);
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
