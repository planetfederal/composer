/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import java.util.Iterator;
import java.util.logging.Logger;

import org.geoserver.config.GeoServer;
import org.geotools.data.DataAccessFactory;
import org.geotools.data.DataAccessFactory.Param;
import org.geotools.data.DataAccessFinder;
import org.geotools.util.logging.Logging;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

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
            String format = format(f.getDisplayName());
            list.addObject()
                .put("name", format)
                .put("title",f.getDisplayName() )
                .put("description", f.getDescription() )
                .put("available", f.isAvailable() );
        }
        return list;
    }

    @RequestMapping(value = "/{name}", method = RequestMethod.GET)
    public @ResponseBody
    JSONObj get(@PathVariable String name) {
        DataAccessFactory f = findFormat( name );
        if( f == null ){
            throw new IllegalArgumentException("Unknown format "+name);
        }
        String format = format(f.getDisplayName());
        JSONObj obj = new JSONObj()
            .put("name",format)
            .put("title", f.getDisplayName() )
            .put("description", f.getDescription() )
            .put("available", f.isAvailable() );
        
        JSONArr connection = obj.putArray("connection");
        for(Param p : f.getParametersInfo()){
            IO.param( connection.addObject(), p );
        }
        return obj;
    }

    private DataAccessFactory findFormat(String name) {
        if( name != null ){
            for (Iterator<DataAccessFactory> i = DataAccessFinder.getAllDataStores(); i.hasNext();) {
                DataAccessFactory f = i.next();
                String format = format(f.getDisplayName());
                if(name.equals(format.equals(name))){
                    return f;
                }
            }
        }
        return null;
    }
    
    String format(String displayName){
        if("Directory of spatial files (shapefiles)".equals(displayName)){
            return "directory";
        }
        if("Directory of spatial files (shapefiles)".equals(displayName)){
            return "directory";
        }
        String name = displayName.toLowerCase();
        name = name.replace(" ", "_");
        name = name.replace("_ng","");
        name = name.replace("(ng)","");
        name = name.replace("(jndi)","jndi");
        name = name.replace("(oci)","jndi");
        name = name.replace("microsoft_", "");
        if(name.endsWith("_")){
            name = name.substring(0, name.length()-1);
        }
        return name;        
    }
        
 }
