package com.boundlessgeo.geoserver.bundle;


import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.io.ParseException;
import com.vividsolutions.jts.io.WKTReader;
import org.apache.commons.io.FileUtils;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.impl.CatalogImpl;
import org.geoserver.config.GeoServerPersister;
import org.geoserver.config.util.XStreamPersisterFactory;
import org.geoserver.platform.GeoServerResourceLoader;
import org.geotools.util.logging.Logging;
import org.junit.After;
import org.junit.Before;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

public class BundleTestSupport {

    //protected Path dataDir;

    protected Catalog cat;

    @Before
    public void quietLogging() {
        Logger log = Logging.getLogger("org.geoserver.platform");
        log.setLevel(Level.OFF);
    }

    @Before
    public void setUp() throws IOException {
        cat = createCatalog();
    }

    @After
    public void tearDown() throws IOException {
        File dataDir = cat.getResourceLoader().getBaseDirectory();
        try {
            cat.dispose();
        }
        catch(Exception e) {
            e.printStackTrace();
        }
        FileUtils.deleteDirectory(dataDir);
    }

    protected Catalog createCatalog() throws IOException {
        Path dataDir = Files.createTempDirectory(Paths.get("target"), "data");
        GeoServerResourceLoader resourceLoader = new GeoServerResourceLoader(dataDir.toFile());

        Catalog cat = new CatalogImpl();
        cat.setResourceLoader(resourceLoader);
        cat.addListener(new GeoServerPersister(resourceLoader, new XStreamPersisterFactory().createXMLPersister()));
        return cat;
    }

    protected Map<String,Object> featureData(Object... kvp) {
        if (kvp.length % 2 != 0) {
            throw new IllegalArgumentException("method takes even number of arguments");
        }

        LinkedHashMap<String,Object> map = new LinkedHashMap<>();
        for (int i = 0; i < kvp.length; i+=2) {
            map.put(kvp[i].toString(), kvp[i+1]);
        }

        return map;
    }

    protected List<Map<String,Object>> stuff() throws Exception {
        List<Map<String,Object>> stuff = new ArrayList<>();
        stuff.add(featureData("geom", geo("POINT(0 0)"), "name", "zero", "id", 0));
        stuff.add(featureData("geom", geo("POINT(1 1)"), "name", "one", "id", 1));
        stuff.add(featureData("geom", geo("POINT(2 2)"), "name", "two", "id", 2));
        return stuff;
    }

    protected List<Map<String,Object>> widgets() throws Exception {
        List<Map<String,Object>> widgets = new ArrayList<>();
        widgets.add(featureData("geom", geo("POINT(0 0)"), "name", "bomb", "id", 0));
        widgets.add(featureData("geom", geo("POINT(1 1)"), "name", "anvil", "id", 1));
        widgets.add(featureData("geom", geo("POINT(2 2)"), "name", "dynamite", "id", 2));
        return widgets;
    }

    protected Geometry geo(String wkt) throws ParseException {
        return new WKTReader().read(wkt);
    }
}
