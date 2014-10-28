/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import com.boundlessgeo.geoserver.api.exceptions.NotFoundException;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;
import com.google.common.base.Function;
import org.geoserver.config.GeoServer;
import org.geotools.coverage.grid.io.GridFormatFinder;
import org.geotools.data.DataAccessFactory;
import org.geotools.data.DataAccessFactory.Param;
import org.geotools.data.DataAccessFinder;
import org.geotools.data.wms.WebMapServer;
import org.geotools.jdbc.JDBCJNDIDataStoreFactory;
import org.geotools.util.logging.Logging;
import org.opengis.coverage.grid.Format;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.annotation.Nullable;
import java.net.URL;
import java.util.Arrays;
import java.util.Collections;
import java.util.Iterator;
import java.util.logging.Logger;

import static com.google.common.base.Predicates.instanceOf;
import static com.google.common.base.Predicates.not;
import static com.google.common.collect.Iterables.concat;
import static com.google.common.collect.Iterables.filter;
import static com.google.common.collect.Iterables.transform;

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
    public @ResponseBody JSONArr list() {
        JSONArr list = new JSONArr();
        for (DataFormat<?> format : formats()) {
            encode(list.addObject(), format);
        }

        return list;
    }

    @RequestMapping(value = "/{name}", method = RequestMethod.GET)
    public @ResponseBody
    JSONObj get(@PathVariable String name) {
        DataFormat<DataAccessFactory> f = findVectorFormat(name);
        if( f != null ){
            JSONObj obj = encode(new JSONObj(), f);
            JSONObj params = obj.putObject("params");
            for(Param p : f.real.getParametersInfo()){
                IO.param(params, p);
            }
            return obj;
        }

        DataFormat<Format> g = findRasterFormat(name);
        if( g != null ){
            JSONObj obj = encode(new JSONObj(), g);

            obj.put("vendor", g.real.getVendor())
               .put("version", g.real.getVersion());

            JSONArr connection = obj.putArray("params");
            IO.param(connection.addObject(), g.real);

            return obj;
        }

        DataFormat<Class<?>> s = findServiceFormat(name);
        if ( s != null) {
            JSONObj obj = encode(new JSONObj(), s);

            obj.putArray("params").addObject()
                .put("name","wms")
                .put("title","URL")
                .put("description","GetCapabilities URL for WMS Service")
                .put("type",URL.class.getSimpleName())
                .put("default",null)
                .put("level","user")
                .put("required",true);
            return obj;
        }

        throw new NotFoundException("Unrecognized format: " + name);
    }

    JSONObj encode(JSONObj obj, DataFormat<?> format) {
        return obj.put("name", format.name)
        .put("title", format.title )
        .put("description", format.description)
        //.put("available", f.isAvailable() )
        .put("type", format.type)
        .put("kind", format.kind);
    }

    private DataFormat<Format> findRasterFormat(String name) {
        if (name != null) {
            for (Format f : GridFormatFinder.getFormatArray()) {
                if( name.equals(formatName(f.getName()))){
                    return format(f);
                }
            }
        }
        return null;
    }

    private DataFormat<DataAccessFactory> findVectorFormat(String name) {
        if( name != null ){
            for (Iterator<DataAccessFactory> i = DataAccessFinder.getAllDataStores(); i.hasNext();) {
                DataAccessFactory f = i.next();
                if(name.equals(formatName(f.getDisplayName()))){
                    return format(f);
                }
            }
        }
        return null;
    }

    private DataFormat<Class<?>> findServiceFormat(String name) {
        if ("wms".equalsIgnoreCase(name)) {
            return format(WebMapServer.class);
        }
        return null;
    }

    /** Convert display name to shorter format name */
    static String formatName(String displayName){
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

    Iterable<DataFormat> formats() {
        return concat(vectorFormats(), rasterFormats(), serviceFormats());
    }

    Iterable<DataFormat> vectorFormats() {
        Iterable<DataAccessFactory> it = new Iterable<DataAccessFactory>() {
            @Override
            public Iterator<DataAccessFactory> iterator() {
                return DataAccessFinder.getAllDataStores();
            }
        };

        return transform(filter(it, not(instanceOf(JDBCJNDIDataStoreFactory.class))),
            new Function<DataAccessFactory, DataFormat>() {
                @Nullable
                @Override
                public DataFormat apply(@Nullable DataAccessFactory f) {
                    return format(f);
                }
            });
    }

    Iterable<DataFormat> rasterFormats() {
        return transform(Arrays.asList(GridFormatFinder.getFormatArray()), new Function<Format, DataFormat>() {
            @Override
            public DataFormat apply(@Nullable Format g) {
                return format(g);
            }
        });
    }

    Iterable<DataFormat<Class<?>>> serviceFormats() {
        return Collections.singleton(format(WebMapServer.class));
    }

    DataFormat<DataAccessFactory> format(DataAccessFactory f) {
        IO.Kind kind = IO.Kind.of(f);
        return new DataFormat<DataAccessFactory>(formatName(f.getDisplayName()), f.getDisplayName(), f.getDescription(),
                "vector", kind.toString().toLowerCase(), f);
    }

    DataFormat<Format> format(Format g) {
        return new DataFormat<Format>(formatName(g.getName()), g.getName(), g.getDescription(), "raster", "file", g);
    }

    DataFormat<Class<?>> format(Class<WebMapServer> clazz) {
        return new DataFormat<Class<?>>("wms", "Web Map Service", "Layers from a remote Web Map Service",
            "service", null, WebMapServer.class);
    }

    static class DataFormat<T> {
        final String name;
        final String title;
        final String description;
        final String kind;
        final String type;
        final T real;

        DataFormat(String name, String title, String description, String kind, String type, T real) {
            this.name = name;
            this.title = title;
            this.description = description;
            this.kind = kind;
            this.type = type;
            this.real = real;
        }

        @Override
        public String toString() {
            return name;
        }
    }
 }
