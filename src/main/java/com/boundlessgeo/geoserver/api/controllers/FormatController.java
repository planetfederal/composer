/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import java.net.URL;
import java.util.Iterator;
import java.util.logging.Logger;

import org.geoserver.config.GeoServer;
import org.geotools.coverage.grid.io.GridFormatFinder;
import org.geotools.data.DataAccessFactory;
import org.geotools.data.DataAccessFactory.Param;
import org.geotools.data.DataAccessFinder;
import org.geotools.factory.CommonFactoryFinder;
import org.geotools.util.logging.Logging;
import org.opengis.coverage.grid.Format;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.boundlessgeo.geoserver.api.controllers.StoreController.Type;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;

/**
 * Details on supported formats.
 * <p>
 * This API is locked down for map composer and is (not intended to be stable between releases).</p>
 * 
 * @see <a href="https://github.com/boundlessgeo/suite/wiki/Stores-API">Store API</a> (Wiki)
 */
 @Controller
 @RequestMapping("/api/formats")
 public class FormatController extends ApiController {
     static Logger LOG = Logging.getLogger(FormatController.class);

    @Autowired
    public FormatController(GeoServer geoServer) {
        super(geoServer);
    }

    @RequestMapping(method = RequestMethod.GET)
    public @ResponseBody
    JSONArr list(){
        JSONArr list = new JSONArr();
        for (Iterator<DataAccessFactory> i = DataAccessFinder.getAllDataStores(); i.hasNext();) {
            DataAccessFactory f = i.next();
            String name = format(f.getDisplayName());
            StoreController.Type type = StoreController.Type.of(f);
            list.addObject()
                .put("name", name)
                .put("title",f.getDisplayName() )
                .put("description", f.getDescription() )
                .put("available", f.isAvailable() )
                .put("type",type.toString())
                .put("kind","VECTOR");            
        }
        for(Format f : GridFormatFinder.getFormatArray()){
            String name = format(f.getName());
            list.addObject()
                .put("name", name)
                .put("title",f.getName() )
                .put("description", f.getDescription() )
                .put("available", true )
                .put("type","FILE")
                .put("kind","RASTER");
        }
        list.addObject()
            .put("name", "wms")
            .put("title","Web Map Service" )
            .put("description", "Cascade layers from a remote Web Map Service" )
            .put("available", true )
            .put("type","WEB")
            .put("kind","SERVICE");        
        
        return list;
    }

    @RequestMapping(value = "/{name}", method = RequestMethod.GET)
    public @ResponseBody
    JSONObj get(@PathVariable String name) {
        DataAccessFactory f = findDataAccessFormat( name );
        if( f != null ){
            String format = format(f.getDisplayName());
            JSONObj obj = new JSONObj()
                .put("name",format)
                .put("title", f.getDisplayName() )
                .put("description", f.getDescription() )
                .put("available", f.isAvailable() );
            
            StoreController.Type type = StoreController.Type.of(f);
            obj.put("type",type.toString());
            obj.put("kind","VECTOR");
            
            JSONArr connection = obj.putArray("connection");
            for(Param p : f.getParametersInfo()){
                IO.param( connection.addObject(), p );
            }
            return obj;
        }
        Format g = findGridCoverageFormat(name);
        if( g != null ){
            String format = format(g.getName());
            JSONObj obj = new JSONObj()
                .put("name",format)
                .put("title", g.getName() )
                .put("description", g.getDescription() )
                .put("available", true );
            
            obj.put("type","FILE");
            obj.put("kind","RASTER");
            
            obj.put("vendor", g.getVendor() )
               .put("version", g.getVersion() );
            
            JSONArr connection = obj.putArray("connection");
            IO.param( connection.addObject(), g );

            return obj;
        }        
        if( "wms".equals(name)){
            JSONObj obj = new JSONObj()
                .put("name", "wms")
                .put("title","Web Map Service" )
                .put("description", "Cascade layers from a remote Web Map Service" )
                .put("available", true );
            
            obj.put("type","WEB");
            obj.put("kind","SERVICE");
            
            JSONArr connection = obj.putArray("connection");
            connection.addObject()
                .put("name","wms")
                .put("title","URL")
                .put("description","GetCapabilities URL for WMS Service")
                .put("type",URL.class.getSimpleName())
                .put("default",null)
                .put("level","user")
                .put("required",true);
            return obj;
        }
        throw new IllegalArgumentException("Unknown format "+name);
    }

    private Format findGridCoverageFormat(String name) {
        if (name != null) {
            for (Format f : GridFormatFinder.getFormatArray()) {
                String format = format(f.getName());
                if( name.equals(format)){
                    return f;
                }
            }
        }
        return null;
    }
    private DataAccessFactory findDataAccessFormat(String name) {
        if( name != null ){
            for (Iterator<DataAccessFactory> i = DataAccessFinder.getAllDataStores(); i.hasNext();) {
                DataAccessFactory f = i.next();
                String format = format(f.getDisplayName());
                if(format.equals(name)){
                    return f;
                }
            }
        }
        return null;
    }
    
    /** Convert display name to shorter format name */
    static String format(String displayName){
        if("Directory of spatial files (shapefiles)".equals(displayName)){
            return "directory";
        }
        String name = displayName.toLowerCase();
        name = name.replace(" ", "_");
        name = name.replace("_ng","");
        name = name.replace("(ng)","");
        name = name.replace("(jndi)","jndi");
        name = name.replace("(oci)","oci");
        name = name.replace("microsoft_", "");
        if(name.endsWith("_")){
            name = name.substring(0, name.length()-1);
        }
        return name;        
    }
        
 }
