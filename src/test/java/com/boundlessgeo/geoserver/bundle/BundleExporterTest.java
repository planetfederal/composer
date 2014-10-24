package com.boundlessgeo.geoserver.bundle;

import com.boundlessgeo.geoserver.json.JSONObj;
import com.boundlessgeo.geoserver.json.JSONWrapper;
import org.apache.commons.io.FileUtils;
import org.geoserver.catalog.DataStoreInfo;
import org.geoserver.config.util.XStreamPersisterFactory;
import org.geotools.geopkg.GeoPackage;
import org.junit.After;
import org.junit.Test;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class BundleExporterTest extends BundleTestSupport {

    BundleExporter exporter;

    @After
    public void cleanup() throws IOException {
        //exporter.cleanup();
    }

    @Test
    public void testSimple() throws Exception {
        new CatalogCreator(cat).workspace("foo")
            .property("bar")
                .featureType("stuff", "geom:Point:srid=4326,name:String,id:Integer", stuff()).layer();

        exporter = new BundleExporter(cat, new ExportOpts(cat.getWorkspaceByName("foo")));
        Path root = exporter.run();

        assertPathExists(root, "workspace.xml");
        assertPathExists(root, "namespace.xml");
        assertPathExists(root, "bar");
        assertPathExists(root, "bar/datastore.xml");
        assertPathExists(root, "bar/stuff");
        assertPathExists(root, "bar/stuff/featuretype.xml");
        assertPathExists(root, "bar/stuff/layer.xml");
        assertPathExists(root, "styles");
        assertPathExists(root, "styles/stuff.xml");
        assertPathExists(root, "styles/stuff.sld");
        assertPathExists(root, "data/bar/stuff.properties");

        // ensure the exported store config points to the properties
        DataStoreInfo store = new XStreamPersisterFactory().createXMLPersister()
                .load(new FileInputStream(root.resolve("bar/datastore.xml").toFile()), DataStoreInfo.class);

        assertEquals("file:%WORKSPACE%/data/bar", store.getConnectionParameters().get("directory"));
    }

    @Test
    public void testInjestIntoGeopkg() throws Exception {
        new CatalogCreator(cat).workspace("foo")
            .database("bar")
                .featureType("stuff", "geom:Point:srid=4326,name:String,id:Integer", stuff()).layer().store()
                .featureType("widgets", "geom:Point:srid=4326,name:String,id:Integer", widgets()).layer();

        exporter = new BundleExporter(cat, new ExportOpts(cat.getWorkspaceByName("foo")));
        Path root = exporter.run();

        assertPathExists(root, "workspace.xml");
        assertPathExists(root, "namespace.xml");
        assertPathExists(root, "bar/datastore.xml");
        assertPathExists(root, "bar/stuff/featuretype.xml");
        assertPathExists(root, "bar/stuff/layer.xml");
        assertPathExists(root, "bar/widgets/featuretype.xml");
        assertPathExists(root, "bar/widgets/layer.xml");
        assertPathExists(root, "data/bar.gpkg");

        // ensure the geopackage has the right data in it
        GeoPackage gpkg = new GeoPackage(root.resolve("data/bar.gpkg").toFile());
        try {
            assertEquals(2, gpkg.features().size());
            assertNotNull(gpkg.feature("stuff"));
            assertNotNull(gpkg.feature("widgets"));
        }
        finally {
            gpkg.close();
        }

        // ensure the exported store config points to the geopackage
        DataStoreInfo store = new XStreamPersisterFactory().createXMLPersister()
            .load(new FileInputStream(root.resolve("bar/datastore.xml").toFile()), DataStoreInfo.class);

        assertEquals("geopkg", store.getConnectionParameters().get("dbtype"));
        assertEquals("file:%WORKSPACE%/data/bar.gpkg", store.getConnectionParameters().get("database"));
    }

    @Test
    public void testBundleInfo() throws Exception {
        new CatalogCreator(cat).workspace("foo");

        exporter = new BundleExporter(cat,
            new ExportOpts(cat.getWorkspaceByName("foo")).name("blah"));
        Path root = exporter.run();

        assertPathExists(root, "bundle.json");

        try (
            FileInputStream in =  new FileInputStream(root.resolve("bundle.json").toFile());
        ) {
            JSONObj obj = JSONWrapper.read(in).toObject();
            assertEquals("blah", obj.str("name"));
        }
    }

    @Test
    public void testZipBundle() throws Exception {
        new CatalogCreator(cat).workspace("foo");
        exporter = new BundleExporter(cat,
            new ExportOpts(cat.getWorkspaceByName("foo")).name("blah"));

        exporter.run();
        Path zip = exporter.zip();
        ZipInputStream zin = new ZipInputStream(new ByteArrayInputStream(FileUtils.readFileToByteArray(zip.toFile())));
        ZipEntry entry = null;

        boolean foundBundle = false;
        boolean foundWorkspace = false;

        while (((entry = zin.getNextEntry()) != null)) {
            if (entry.getName().equals("bundle.json")) {
                foundBundle = true;
            }
            if (entry.getName().endsWith("workspace.xml")) {
                foundWorkspace = true;
            }
        }

        assertTrue(foundBundle);
        assertTrue(foundWorkspace);
    }

    @Test
    public void testConvertGlobalStyles() throws Exception {
        new CatalogCreator(cat).workspace("foo")
            .property("bar")
                .featureType("stuff", "geom:Point:srid=4326,name:String,id:Integer", stuff()).layer(true);

        exporter = new BundleExporter(cat, new ExportOpts(cat.getWorkspaceByName("foo")).name("blah"));
        Path root = exporter.run();

        assertPathExists(root, "styles/foo_stuff.xml");
        assertPathExists(root, "styles/foo_stuff.sld");
    }

    void assertPathExists(Path root, String path) {
        assertTrue(root.resolve(path).toFile().exists());
    }
}
