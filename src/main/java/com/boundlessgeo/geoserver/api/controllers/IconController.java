/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
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

import com.boundlessgeo.geoserver.api.exceptions.NotFoundException;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;
import com.boundlessgeo.geoserver.util.StyleAdaptor;

@Controller
@RequestMapping("/api/icons")
public class IconController extends ApiController {

    static Logger LOG = Logging.getLogger(IconController.class);

    @SuppressWarnings({ "unchecked", "rawtypes" })
    public static Map<String,String> ICON_FORMATS = new HashMap<String,String>(
        (Map)new KVP(
            "png","image/png",
            "jpeg","image/jpeg",
            "jpg","image/jpeg",
            "gif","image/gif",
            "svg","image/svg+xml",
            "ttf","application/font-sfnt",
            "properties","text/x-java-properties")
    );
    
    @Autowired
    public IconController(GeoServer geoServer) {
        super(geoServer);
    }
    
    @RequestMapping(value = "/{wsName}", method = RequestMethod.GET)
    public @ResponseBody JSONArr list(@PathVariable String wsName, HttpServletRequest request) throws IOException {

        WorkspaceInfo ws = findWorkspace(wsName, catalog());

        JSONArr arr = new JSONArr();

        Resource styles =  dataDir().get(ws, "styles");
        if (styles.getType() != Type.UNDEFINED) {
            Set<String> usedGraphics = findAllGraphics(ws);

            for(Resource r : styles.list()){
                String name = r.name();
                String ext = fileExt(name);

                if(!ICON_FORMATS.containsKey(ext.toLowerCase())){
                    continue;
                }

                JSONObj item = icon(arr.addObject(), ws, r, request);
                item.put("used", usedGraphics.contains(name));
            }
        }

        return arr;
    }
    

    @RequestMapping(value = "/{wsName}", method = RequestMethod.POST,consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public @ResponseStatus(value=HttpStatus.CREATED)
        @ResponseBody JSONArr create(@PathVariable String wsName,  HttpServletRequest request )
        throws IOException, FileUploadException {

        WorkspaceInfo ws = findWorkspace(wsName, catalog());
        
        // Resource resource = dataDir().get(ws).get("icons"); // GEOS-6690
        GeoServerResourceLoader rl = geoServer.getCatalog().getResourceLoader();        
        Resource styles = rl.get(Paths.path("workspaces",ws.getName(),"styles"));

        ServletFileUpload upload = new ServletFileUpload(new DiskFileItemFactory());
        @SuppressWarnings("unchecked")
        List<FileItem> input = (List<FileItem>) upload.parseRequest(request);

        JSONArr created = new JSONArr();
        for (FileItem file : input) {
            String filename = file.getName();

            // trim filename if required
            if (filename.lastIndexOf('/') != -1) {
                filename = filename.substring(filename.lastIndexOf('/'));
            }
            if (filename.lastIndexOf('\\') != -1) {
                filename = filename.substring(filename.lastIndexOf('\\'));
            }
            String ext = fileExt(filename);
            if( !ICON_FORMATS.containsKey(ext)){
                String msg = "Icon "+filename+" format "+ext+" unsupported - try:"+ICON_FORMATS.keySet();
                LOG.warning(msg);
                throw new FileUploadException(msg);
            }
            try {
                InputStream data = file.getInputStream();                
                Resources.copy(data, styles, filename);

                icon(created.addObject(), ws, styles.get(filename), request);
            } catch (Exception e) {
                throw new FileUploadException("Unable to write "+filename,e);
            }
        }

        return created;
    }
    

    JSONObj icon(JSONObj obj, WorkspaceInfo ws, Resource r, HttpServletRequest req) {
        String filename = r.name();
        String ext = fileExt(filename);
        Object format = ICON_FORMATS.get(ext.toLowerCase());
        
        obj.put("name", filename)
            .put("format",ext)
            .put("mime",format)
            .put("url", IO.apiUrl( req,  "/icons/%s/%s", ws.getName(),filename ));

        IO.date(obj.putObject("modified"), new Date(r.lastmodified()));
        return obj;
    }

    @RequestMapping(value = "/{wsName}/{icon:.+}", method = RequestMethod.GET)
    public @ResponseBody byte[] raw(@PathVariable String wsName, @PathVariable String icon,
                                   HttpServletResponse response) throws IOException {

        WorkspaceInfo ws = findWorkspace(wsName, catalog());

        GeoServerResourceLoader rl = geoServer.getCatalog().getResourceLoader();
        Resource resource = rl.get(Paths.path("workspaces",ws.getName(),"styles",icon));

        if( resource.getType() != Type.RESOURCE ){
            throw new NotFoundException("Icon "+icon+" not found");
        }
        String ext = fileExt(icon);
        if( !ICON_FORMATS.containsKey(ext)){
            throw new NotFoundException("Icon "+icon+" format unsupported");
        }
        String mimeType = ICON_FORMATS.get(ext.toLowerCase());

        response.setContentType(mimeType);
        //response.setStatus(HttpServletResponse.SC_OK);
        response.setDateHeader("Last-Modified", resource.lastmodified() );
        //IOUtils.copy(resource.in(), response.getOutputStream());

        try (
            InputStream in = resource.in();
        ) {
            return IOUtils.toByteArray(in);
        }
    }

    @RequestMapping(value = "/{wsName}/{icon:.+}", method = RequestMethod.DELETE)
    public boolean delete(@PathVariable String wsName, @PathVariable String icon) throws IOException {

        WorkspaceInfo ws = findWorkspace(wsName, catalog());

        GeoServerResourceLoader rl = geoServer.getCatalog().getResourceLoader();
        Resource resource = rl.get(Paths.path("workspaces",ws.getName(),"styles",icon));
        if( resource.getType() != Type.RESOURCE ){
            throw new NotFoundException("Icon "+icon+" not found");
        }
        String ext = fileExt(icon);
        if( !ICON_FORMATS.containsKey(ext)){
            throw new NotFoundException("Icon "+icon+" format unsupported");
        }
        return resource.delete();
    }
    
    @ExceptionHandler(FileUploadException.class)
    public @ResponseBody JSONObj error(FileUploadException e, HttpServletResponse response) {
        response.setStatus(HttpStatus.BAD_REQUEST.value());
        return IO.error(new JSONObj(), e );
    }
    @ExceptionHandler(IllegalArgumentException.class)
    public @ResponseBody JSONObj error(IllegalArgumentException e, HttpServletResponse response) {
        response.setStatus(HttpStatus.BAD_REQUEST.value());
        return IO.error(new JSONObj(), e );
    }
    

    /** 
     * Check what icons/fonts are referenced style.
     * @return Set of icons used by layer.
     * @throws IOException Trouble access default style
     */    
    @SuppressWarnings("unchecked")
    private Set<String> findAllGraphics(WorkspaceInfo ws) throws IOException {
        final Catalog cat = geoServer.getCatalog();

        final Set<String> externalGraphics = new HashSet<String>();
        
        ws.accept( new CatalogVisitorAdapter() {
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

    String fileExt(String filename) {
        return FilenameUtils.getExtension(filename.toLowerCase());
    }
}
