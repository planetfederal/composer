package org.opengeo.app;

import java.io.File;
import java.io.Serializable;
import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.CoverageStoreInfo;
import org.geoserver.catalog.DataStoreInfo;
import org.geoserver.catalog.LayerGroupInfo;
import org.geoserver.catalog.StoreInfo;
import org.geoserver.catalog.WMSStoreInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.config.GeoServer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * Used to connect to data storage (file, database, or service).
 * 
 * @see <a href="https://github.com/boundlessgeo/suite/wiki/Stores-API">Store API</a> (Wiki)
 */
 @Controller
 @RequestMapping("/api/stores")
 public class StoreController extends AppController {

    @Autowired
    public StoreController(GeoServer geoServer) {
        super(geoServer);
    }

    @RequestMapping(value = "/{wsName}", method = RequestMethod.GET)
    public @ResponseBody JSONArr list(@PathVariable String wsName){
        JSONArr arr = new JSONArr();
        Catalog cat = geoServer.getCatalog();
        for( StoreInfo store : cat.getStoresByWorkspace(wsName, StoreInfo.class) ){
            store( arr.addObject(), store, wsName, false );
        }
        return arr;
    }
    
    @RequestMapping(value = "/{wsName}/{name}", method = RequestMethod.GET)
    public @ResponseBody
    JSONObj get(@PathVariable String wsName,
                @PathVariable String name){
        if( name == null ){
            throw new IllegalArgumentException("Store name required");
        }
        Catalog cat = geoServer.getCatalog();
        StoreInfo store = cat.getStoreByName(wsName, name, StoreInfo.class);
        JSONObj obj = store( new JSONObj(), store, wsName, true );
        
        return obj;
    }
    
    public enum Type {FILE,DATABASE,SERVICE,GENERIC;
        static Type of( StoreInfo store ){
            Map<String, Serializable> params = store.getConnectionParameters();
            if( params.containsKey("dbtype")){
                return Type.DATABASE;
            }
            if( store instanceof WMSStoreInfo){
                return Type.SERVICE;
            }
            if( params.keySet().contains("directory") ||
                params.keySet().contains("file") ){
                
                return Type.FILE;
            }
            if( params.containsKey("url")){
                Object value = params.get("url");
                if( value instanceof File ||
                    (value instanceof String && ((String)value).startsWith("file:"))){
                    return Type.FILE;
                }
            }
            return Type.GENERIC;
        }        
    }
    public enum Kind {RASTER,VECTOR,CASCADE,OTHER;
        static Kind of( StoreInfo store ){
            if( store instanceof CoverageStoreInfo){
                return Kind.RASTER;
            }
            else if( store instanceof DataStoreInfo){
                return Kind.VECTOR;
            }
            else if(store instanceof WMSStoreInfo){
                return Kind.CASCADE;
            }
            return Kind.OTHER;
        }
    }
    JSONObj store(JSONObj obj, StoreInfo store, String wsName, boolean details) {       
        obj.put("name", store.getName() )
           .put("workspace", store.getWorkspace().getName())
           .put("description", store.getDescription())
           .put("format", store.getType() )
           .put("type", Type.of(store).name())
           .put("kind", Kind.of(store).name())
           .put("enabled", store.isEnabled());
        
        if (details){
            JSONObj connection = obj.putObject("connection");
            Map<String, Serializable> params = store.getConnectionParameters();
            for( Entry<String,Serializable> param : params.entrySet() ){
                String key = param.getKey();
                Object value = param.getValue();
                String text = value.toString();
                
                connection.put( key, text );
            }
        }
        if( details ){
            IO.metadata(obj,  store.getMetadata() );
        }
        return obj;
    }

}
