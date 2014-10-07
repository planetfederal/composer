package org.opengeo.app;

import java.io.File;
import java.io.Serializable;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.CoverageStoreInfo;
import org.geoserver.catalog.DataStoreInfo;
import org.geoserver.catalog.LayerGroupInfo;
import org.geoserver.catalog.ResourcePool;
import org.geoserver.catalog.StoreInfo;
import org.geoserver.catalog.WMSStoreInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.config.GeoServer;
import org.geoserver.platform.GeoServerResourceLoader;
import org.geoserver.platform.resource.Files;
import org.geoserver.platform.resource.Paths;
import org.geoserver.platform.resource.Resources;
import org.geotools.jdbc.JDBCDataStoreFactory;
import org.geotools.util.Converters;
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
    
    public enum Type {FILE,DATABASE,WEB,GENERIC;
        static Type of( StoreInfo store ){
            if( store instanceof CoverageStoreInfo){
                String url = ((CoverageStoreInfo)store).getURL();
                if( url.startsWith("file")){
                    return Type.FILE;
                }
                else if( url.startsWith("http") ||
                         url.startsWith("https") ||
                         url.startsWith("ftp") ||
                         url.startsWith("sftp")){
                    return Type.WEB;
                }
            }
            Map<String, Serializable> params = store.getConnectionParameters();
            if( params.containsKey("dbtype")){
                return Type.DATABASE;
            }
            if( store instanceof WMSStoreInfo){
                return Type.WEB;
            }
            if( params.keySet().contains("directory") ||
                params.keySet().contains("file") ){
                
                return Type.FILE;
            }
            for( Object value : params.values()){
                if( value == null ) continue;
                if( value instanceof File ||
                    (value instanceof String && ((String)value).startsWith("file:")) ||
                    (value instanceof URL && ((URL)value).getProtocol().equals("file"))){
                    return Type.FILE;
                }
                if( (value instanceof String && ((String)value).startsWith("http:")) ||
                    (value instanceof URL && ((URL)value).getProtocol().equals("http"))){
                    return Type.WEB;
                }
                if( value instanceof String && ((String)value).startsWith("jdbc:")){
                    return Type.DATABASE;
                }
            }
            return Type.GENERIC;
        }        
    }
    public enum Kind {RASTER,VECTOR,SERVICE,UNKNOWN;
        static Kind of( StoreInfo store ){
            if( store instanceof CoverageStoreInfo){
                return Kind.RASTER;
            }
            else if( store instanceof DataStoreInfo){
                return Kind.VECTOR;
            }
            else if(store instanceof WMSStoreInfo){
                return Kind.SERVICE;
            }
            return Kind.UNKNOWN;
        }
    }
    JSONObj store(JSONObj obj, StoreInfo store, String wsName, boolean details) {       
        String name = store.getName();
        
        obj.put("name", name )
           .put("workspace", store.getWorkspace().getName())
           .put("description", store.getDescription())
           .put("enabled", store.isEnabled());

        Type type = Type.of(store);
        Kind kind = Kind.of(store);
        String source = source( store );
        obj.put("source", source )
           .put("format", store.getType() )
           .put("type", type.name())
           .put("kind", kind.name());           
          
        if (details){
            JSONObj connection = new JSONObj();
            Map<String, Serializable> params = store.getConnectionParameters();
            for( Entry<String,Serializable> param : params.entrySet() ){
                String key = param.getKey();
                Object value = param.getValue();
                String text = value.toString();
                
                connection.put( key, text );
            }
            if( connection.size() != 0 ){
                obj.put("connection", connection );
            }
            IO.metadataHistory(obj,  store.getMetadata() );
            JSONObj metadata = IO.metadata( new JSONObj(), store.getMetadata(), true );
            if( metadata.size() != 0 ){
                obj.put("metadata",metadata);
            }
            if( store instanceof CoverageStoreInfo){
                obj.put("url", ((CoverageStoreInfo)store).getURL());
            }
            
        }
        return obj;
    }
    
    /** 
     * Storage source.
     * <p>
     * This method is based on a revise engineering of {@link ServiceInfo#location}.
     *  
     * @param store
     * @return
     */
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
    
    String source( File file ){
        File baseDirectory = dataDir().getResourceLoader().getBaseDirectory();
        
        return file.isAbsolute() ? file.toString() : "data directory > " + Paths.convert(baseDirectory,file);
    }
    String source( URL url ){
        File baseDirectory = dataDir().getResourceLoader().getBaseDirectory();
        
        if( url.getProtocol().equals("file")){
            File file = Files.url(baseDirectory,url.toExternalForm());
            if( file != null && !file.isAbsolute() ){
                return "data directory > " + Paths.convert(baseDirectory, file); 
            }
        }
        return url.toExternalForm();
    }
    String sourceURL( String  url ){
        File baseDirectory = dataDir().getResourceLoader().getBaseDirectory();

        File file = Files.url(baseDirectory,url);
        if( file != null ){
            return "data directory > " + Paths.convert(baseDirectory, file); 
        }
        return url;
    }
    String sourceFile( String file ){
        File baseDirectory = dataDir().getResourceLoader().getBaseDirectory();

        File f = new File( file );
        return f.isAbsolute() ? file : "data directory > " + Paths.convert(baseDirectory,f);
    }
}
