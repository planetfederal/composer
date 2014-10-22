/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import org.geotools.referencing.CRS;
import org.opengis.referencing.crs.CoordinateReferenceSystem;

import java.util.Map;
import java.util.concurrent.Callable;

/**
 * Facade for managing projections.
 * <p>
 * Also manages a cache of recent projection/crs objects used.
 * </p>
 */
public class Proj {

    static volatile Proj INSTANCE;

    public static Proj get() {
        if (INSTANCE == null ) {
            synchronized (Proj.class) {
                if (INSTANCE == null) {
                    INSTANCE = new Proj();
                }
            }
        }
        return INSTANCE;
    }

    Cache<String,CoordinateReferenceSystem> cache;

    Proj() {
        cache = CacheBuilder.newBuilder().maximumSize(10).build();
        try {
            cache.put("EPSG:4326", CRS.decode("EPSG:4326"));
            cache.put("EPSG:3857", CRS.decode("EPSG:3857"));
        }
        catch(Exception e) {
            // something is pretty wrong if this happens
            throw new RuntimeException(e);
        }
    }

    public CoordinateReferenceSystem crs(final String srs) throws Exception {
        return cache.get(srs, new Callable<CoordinateReferenceSystem>() {
            @Override
            public CoordinateReferenceSystem call() throws Exception {
                return CRS.decode(srs);
            }
        });
    }

    public Map<String,CoordinateReferenceSystem> recent() {
        return cache.asMap();
    }

}
