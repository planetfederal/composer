/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import org.geoserver.catalog.Info;
import org.geoserver.catalog.MetadataMap;
import org.geoserver.ows.util.OwsUtils;
import org.geotools.util.Converters;

import java.util.Date;

/**
 * Utility class for dealing with api specific metadata.
 */
public class Metadata {

    static final String CREATED = "created";
    static final String MODIFIED = "modified";

    public static void created(Info obj, Date created) {
        MetadataMap map = map(obj);
        map.put(CREATED, created);
        map.put(MODIFIED, created);
    }

    public static Date created(Info obj) {
        return Converters.convert(map(obj).get(CREATED), Date.class);
    }

    public static void modified(Info obj, Date created) {
        map(obj).put(MODIFIED, created);
    }

    public static Date modified(Info obj) {
        return Converters.convert(map(obj).get(MODIFIED), Date.class);
    }

    static MetadataMap map(Info obj) {
        Object map = OwsUtils.get(obj, "metadata");
        if (map != null && map instanceof MetadataMap) {
            return (MetadataMap) map;
        }
        return new MetadataMap();
    }
}
