package org.opengeo.app;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.wicket.util.file.Files;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.CatalogVisitorAdapter;
import org.geoserver.catalog.LayerGroupInfo;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.PublishedInfo;
import org.geoserver.catalog.StoreInfo;
import org.geoserver.catalog.StyleInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.config.GeoServer;
import org.geoserver.ows.URLMangler.URLType;
import org.geoserver.ows.util.ResponseUtils;
import org.geoserver.platform.GeoServerResourceLoader;
import org.geoserver.platform.resource.Paths;
import org.geoserver.platform.resource.Resource;
import org.geoserver.platform.resource.Resource.Type;
import org.geoserver.platform.resource.Resources;
import org.geotools.styling.Style;
import org.geotools.util.KVP;
import org.geotools.util.logging.Logging;
import org.opengis.metadata.citation.OnLineResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;

@Controller
@RequestMapping("/api/icons")
public class IconController extends AppController {

    static Logger LOG = Logging.getLogger(IconController.class);

    public static KVP ICON_FORMATS = new KVP(
            "png","image/png",
            "jpeg","image/jpeg",
            "jpg","image/jpeg",
            "gif","image/gif",
            "svg","image/svg+xml",
            "ttf","application/font-sfnt",
            "properties","text/x-java-properties");
    
    @Autowired
    public IconController(GeoServer geoServer) {
        super(geoServer);
    }
    
    @RequestMapping(value = "/{wsName}", method = RequestMethod.GET)
    public @ResponseBody JSONArr list(@PathVariable String wsName)
            throws IOException {
        WorkspaceInfo ws = findWorkspace( wsName );
        Set<String> referenced = externalGraphics( wsName );
        GeoServerResourceLoader rl = geoServer.getCatalog().getResourceLoader();

        // Scan workspace styles directory for supported formats
        String path = Paths.path("workspaces",ws.getName(), "styles");
        Resource styles = rl.get(path);
        
        JSONArr arr = new JSONArr();
        for( Resource r : styles.list() ){
            String n = r.name();
            String ext = pathExtension(n);
            
            if( !ICON_FORMATS.containsKey(ext.toLowerCase())){
                continue;
            }
            Object format = ICON_FORMATS.get(ext.toLowerCase());
            JSONObj item = arr.addObject().put("name",n).
               put("format",ext).
               put("mime",format);
            if( referenced.contains(n)){
               item.put("used", true );
            }
        }
        return arr;
    }
    

    @RequestMapping(
            value = "/{wsName}",
            method = RequestMethod.POST,consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public @ResponseStatus(value=HttpStatus.CREATED)
           @ResponseBody
           JSONArr icon(@PathVariable String wsName,
                        HttpServletRequest request )
                                throws IOException, FileUploadException {
        WorkspaceInfo ws = findWorkspace(wsName );        
        
        // Resource resource = dataDir().get(ws).get("icons"); // GEOS-6690
        GeoServerResourceLoader rl = geoServer.getCatalog().getResourceLoader();        
        Resource icons = rl.get(Paths.path("workspaces",ws.getName(),"styles"));

        ServletFileUpload upload = new ServletFileUpload(new DiskFileItemFactory());
        
        @SuppressWarnings("unchecked")
        List<FileItem> input = (List<FileItem>) upload.parseRequest(request);
        for (FileItem file : input) {
            String filename = file.getName();

            // trim filename if required
            if (filename.lastIndexOf('/') != -1) {
                filename = filename.substring(filename.lastIndexOf('/'));
            }
            if (filename.lastIndexOf('\\') != -1) {
                filename = filename.substring(filename.lastIndexOf('\\'));
            }
            String ext = pathExtension(filename);
            if( !ICON_FORMATS.containsKey(ext)){
                String msg = "Icon "+filename+" format "+ext+" unsupported - try:"+ICON_FORMATS.keySet();
                LOG.warning(msg);
                throw new FileUploadException(msg);
            }
            try {
                InputStream data = file.getInputStream();                
                Resources.copy(data, icons, filename );
            } catch (Exception e) {
                throw new FileUploadException("Unable to write "+filename,e);
            }
        }
        return list(wsName);

    }
    

    @SuppressWarnings("unchecked")
    @RequestMapping(value = "/{wsName}/{icon}", method = RequestMethod.GET)
    public @ResponseBody
        JSONObj get(@PathVariable String wsName,
                    @PathVariable String icon) throws IOException {

        WorkspaceInfo ws = findWorkspace(wsName);
        Set<String> referenced = externalGraphics(wsName);
        
        GeoServerResourceLoader rl = geoServer.getCatalog().getResourceLoader();
        Resource resource = rl.get(Paths.path("workspaces",ws.getName(),"styles",icon));
        
        if( resource.getType() != Type.RESOURCE ){
            throw new NotFoundException("Icon "+icon+" not found");
        }
        JSONObj details = new JSONObj();
        String ext = pathExtension(icon);
        Object format = ICON_FORMATS.get(ext.toLowerCase());
        
        details.put("name",icon).
           put("format",ext).
           put("mime",format);
        if( referenced.contains(icon)){
            details.put("used", true );
        }        
        details.put("lastModifed", new Date( resource.lastmodified() ));
        
        String url = ResponseUtils.buildURL(geoServer.getSettings().getProxyBaseUrl(),"workspaces/"+ws.getName()+"/styles/"+icon,null,URLType.RESOURCE);
        details.put("url", url );
        
        return details;
    }
    
    @ExceptionHandler(FileUploadException.class)
    public @ResponseBody JSONObj error(FileUploadException e, HttpServletResponse response) {
        response.setStatus(HttpStatus.BAD_REQUEST.value());
        JSONObj obj = new JSONObj()
            .put("message", e.getMessage())
            .put("trace", AppExceptionHandler.trace(e));
        return obj;
    }
    @ExceptionHandler(IllegalArgumentException.class)
    public @ResponseBody JSONObj error(IllegalArgumentException e, HttpServletResponse response) {
        response.setStatus(HttpStatus.BAD_REQUEST.value());
        JSONObj obj = new JSONObj()
            .put("message", e.getMessage())
            .put("trace", AppExceptionHandler.trace(e));
        return obj;
    }
    

    /** 
     * Check what icons/fonts are referenced style.
     * @param wsName
     * @param layer
     * @return Set of icons used by layer.
     * @throws IOException Trouble access default style
     */    
    @SuppressWarnings("unchecked")
    private Set<String> externalGraphics(String wsName) throws IOException {
        final Catalog cat = geoServer.getCatalog();
        WorkspaceInfo w = findWorkspace(wsName);
        final Set<String> externalGraphics = new HashSet<String>();
        
        w.accept( new CatalogVisitorAdapter() {
            @Override
            public void visit(WorkspaceInfo workspace) {
                for( StoreInfo store : cat.getStoresByWorkspace(workspace,StoreInfo.class)){
                    try {
                        store.accept(this);
                    }
                    catch( Throwable t){
                        LOG.log(Level.FINE,String.format("Trouble checking store %s for icon use:%s", store.getName(),t));
                    }
                }
                for( LayerGroupInfo map : cat.getLayerGroupsByWorkspace(workspace)){
                    try {
                        map.accept(this);
                    }
                    catch( Throwable t){
                        LOG.log(Level.FINE,String.format("Trouble checking map %s for icon use:%s", map.getName(),t));
                    }    
                }
            }
            @Override
            public void visit(LayerGroupInfo layerGroup) {
                for( PublishedInfo child : layerGroup.getLayers() ){
                    try {
                        child.accept(this);
                    }
                    catch( Throwable t){
                        LOG.log(Level.FINE,String.format("Trouble checking layer %s for icon use:%s", child.getName(),t));
                    }
                }
            }
            @Override
            public void visit(LayerInfo layer) {
                StyleInfo style = layer.getDefaultStyle();
                if( style != null ){
                    try {
                        style.accept(this);
                    }
                    catch( Throwable t ){
                        LOG.log(Level.FINE,String.format("Trouble checking layer %s for icon use:%s", layer.getName(),t));
                    }
                }
                else {
                    LOG.fine(String.format("Layer %s has no default style", layer.getName()));
                }
            }
            @Override
            public void visit(StyleInfo s) {
                Style style = null;
                try {
                    style = s.getStyle();
                } catch (IOException e) {
                    LOG.log(Level.FINE,"Unable to access style "+s.getName()+":"+e,e);
                }        
                if( style != null ){
                    style.accept(new StyleAdaptor() {
                        public Object visit(OnLineResource resource, Object data) {
                            try {
                                URI uri = resource.getLinkage();
                                if (uri != null) {
                                    String path = uri.toString();
                                    if( path != null ){
                                        if( path.lastIndexOf('/') != -1 ){
                                            path = path.substring(path.lastIndexOf('/')+1);
                                        }
                                        ((Set<String>) data).add(path);
                                    }
                                }
                            }
                            catch( Throwable t){
                                LOG.log(Level.FINE,String.format("Trouble OnLineResource %s for icon use:%s", resource,t));
                            }
                            return data;
                        }
                    }, externalGraphics);
                }
            }
        });
        return externalGraphics;
    }
    
    /**
     * Replacement for {@link Paths#extension}.
     * <p>
     * Extension is lowercase suitable for use with {@link #ICON_FORMATS}.get(extension).
     * @param filename
     * @return extension for provided filename, or null
     */
    private String pathExtension(String filename) {
        if (filename == null || filename.lastIndexOf('.') == -1) {
            return null;
        }
        String ext = filename.substring(filename.lastIndexOf('.') + 1);
        return ext.toLowerCase();
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
