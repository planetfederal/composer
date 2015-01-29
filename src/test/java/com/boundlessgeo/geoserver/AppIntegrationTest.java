/* (c) 2014-2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver;

import com.boundlessgeo.geoserver.api.controllers.IconController;
import com.boundlessgeo.geoserver.api.controllers.ImportController;
import com.boundlessgeo.geoserver.api.controllers.WorkspaceController;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;
import com.boundlessgeo.geoserver.util.RecentObjectCache;

import net.sf.json.JSONArray;
import net.sf.json.JSONObject;

import org.apache.commons.io.IOUtils;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.CatalogBuilder;
import org.geoserver.catalog.LayerGroupInfo;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.StyleInfo;
import org.geoserver.data.test.SystemTestData;
import org.geoserver.catalog.DataStoreInfo;
import org.geoserver.importer.Importer;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.platform.GeoServerExtensions;
import org.geoserver.platform.resource.Resource;
import org.geotools.data.DataStore;
import org.junit.Before;
import org.junit.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import javax.mail.internet.InternetHeaders;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMultipart;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;

public class AppIntegrationTest extends DbTestSupport {

    @Override
    protected void setUpTestData(SystemTestData testData) throws Exception {
        super.setUpTestData(testData);
        testData.setUpWcs10RasterLayers();
    }

    @Before
    public void removeFoo() {
        removeLayer("gs", "foo");
        removeLayer("sf", "foo");
        removeLayer("cdf", "foo");
    }

    @Before
    public void removeMaps() {
        removeLayerGroup("sf", "map1");
        removeLayerGroup("sf", "map2");
    }

    @Test
    public void testPageLayers() throws Exception {
        JSONObject obj = (JSONObject) getAsJSON(("/app/api/layers/sf"));
        JSONArray arr = obj.getJSONArray("layers");
        assertEquals(3, arr.size());

        obj = (JSONObject) getAsJSON(("/app/api/layers/sf?page=1&count=1"));
        arr = obj.getJSONArray("layers");
        assertEquals(1, arr.size());
    }

    @Test
    public void testPageMaps() throws Exception {
        Catalog cat = getCatalog();
        CatalogBuilder catBuilder = new CatalogBuilder(cat);

        LayerInfo pgf = cat.getLayerByName("sf:PrimitiveGeoFeature");

        LayerGroupInfo map = cat.getFactory().createLayerGroup();
        map.setWorkspace(cat.getWorkspaceByName("sf"));
        map.setName("map1");
        map.getLayers().add(pgf);
        map.getStyles().add(null);
        catBuilder.calculateLayerGroupBounds(map);
        cat.add(map);

        map = cat.getFactory().createLayerGroup();
        map.setWorkspace(cat.getWorkspaceByName("sf"));
        map.setName("map2");
        map.getLayers().add(pgf);
        map.getStyles().add(null);
        catBuilder.calculateLayerGroupBounds(map);
        cat.add(map);

        JSONObject obj = (JSONObject) getAsJSON(("/app/api/maps/sf"));
        assertEquals(2, obj.getInt("total"));
        assertEquals(0, obj.getInt("page"));
        assertEquals(2, obj.getInt("count"));

        JSONArray arr = obj.getJSONArray("maps");
        assertEquals(2, arr.size());

        obj = (JSONObject) getAsJSON(("/app/api/maps/sf?page=1&count=1"));
        assertEquals(2, obj.getInt("total"));
        assertEquals(1, obj.getInt("page"));
        assertEquals(1, obj.getInt("count"));
        arr = obj.getJSONArray("maps");
        assertEquals(1, arr.size());
    }

    @Test
    public void testImportFile() throws Exception {
        Catalog catalog = getCatalog();
        assertNull(catalog.getLayerByName("gs:point"));

        Importer importer =
            GeoServerExtensions.bean(Importer.class, applicationContext);
        ImportController ctrl = new ImportController(getGeoServer(), importer);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setContextPath("/geoserver");
        request.setRequestURI("/geoserver/hello");
        request.setMethod("post");

        createMultiPartFormContent(request, "form-data; name=\"upload\"; filename=\"point.zip\"", "application/zip",
                IOUtils.toByteArray(getClass().getResourceAsStream("point.shp.zip")));

        JSONObj result = ctrl.importFile("gs", request);

        assertEquals(1, result.array("imported").size());
        JSONObj obj = result.array("imported").object(0);

        assertEquals("gs", obj.object("layer").str("workspace"));
        assertEquals("point", obj.object("layer").str("name"));

        LayerInfo l = catalog.getLayerByName("gs:point");
        assertNotNull(l);

        // ensure style in workspace
        StyleInfo s = l.getDefaultStyle();
        assertNotNull(s.getWorkspace());
    }
    
    @Test
    public void testImportDb() throws Exception {
        buildTestData((SystemTestData) testData);
        //DataStoreInfo ds = createH2DataStore(null, "h2");
        //populateDatabase(ds);
        if (!isTestDataAvailable()) {
            LOGGER.warning("Skipping testImportDb because online test data is not available");
            return;
        }
        
        Catalog catalog = getCatalog();
        assertNull(catalog.getLayerByName("gs:point"));

        Importer importer =
            GeoServerExtensions.bean(Importer.class, applicationContext);
        ImportController ctrl = new ImportController(getGeoServer(), importer);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setContextPath("/geoserver");
        request.setRequestURI("/geoserver/hello");
        request.setMethod("post");
        
        JSONObj obj = dbTestData.createConnectionParameters();
        obj = ctrl.importDb("gs", obj);
        
        Long id = Long.parseLong(obj.get("id").toString());
        assertNotNull(id);
        JSONArr preimport = obj.array("preimport");
        assertTrue(3 <= preimport.size());
        assertEquals(0, obj.array("imported").size());
        assertEquals(0, obj.array("pending").size());
        assertEquals(0, obj.array("failed").size());
        assertEquals(0, obj.array("ignored").size());
        
        List<String> names = Arrays.asList(new String[]{"ft1","ft2","ft3"});
        JSONArr tasks = new JSONArr();
        for (JSONObj o : preimport.objects()) {
            if (names.contains(o.get("name"))) {
                tasks.add(o.get("task").toString());
                assertEquals("table", o.get("type"));
            }
        }
        assertEquals(3, tasks.size());
        JSONObj response = new JSONObj();
        response.put("tasks", tasks);
        
        obj = ctrl.update("gs", id, response);
        
        assertEquals(0, obj.array("preimport").size());
        assertEquals(1, obj.array("imported").size());
        assertEquals(2, obj.array("pending").size());
        assertEquals(0, obj.array("failed").size());
        assertEquals(preimport.size()-3, obj.array("ignored").size());
        
        obj = ctrl.get("gs",  id);
    }

    @Test
    public void testIconsUploadDelete() throws Exception {
        Catalog catalog = getCatalog();
        IconController ctrl = new IconController(getGeoServer());
        
        // test upload
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setContextPath("/geoserver");
        request.setRequestURI("/geoserver/api/icons");
        request.setMethod("post");

        createMultiPartFormContent(request, "form-data; name=\"icon\"; filename=\"STYLE.PROPERTIES\"",
            "text/x-java-properties", "square=LINESTRING((0 0,0 1,1 1,1 0,0 0))".getBytes() );

        JSONArr arr = ctrl.create("cite", request);
        assertEquals( 1, arr.size() );
        
        Resource r = catalog.getResourceLoader().get("workspaces/cite/styles/STYLE.PROPERTIES");
        assertEquals("created", Resource.Type.RESOURCE, r.getType() );
        
        // test delete
        MockHttpServletRequestBuilder delete = delete("/api/icons/foo/icon.png");
        boolean removed = ctrl.delete("cite","STYLE.PROPERTIES");
        assertEquals( true, removed );
    }

    @Test
    public void testWorkspaceExport() throws Exception {
        MockHttpServletResponse response = doWorkspaceExport("sf");

        assertEquals("application/zip", response.getContentType());
        assertEquals("attachment; filename=\"sf.zip\"", response.getHeader("Content-Disposition"));

        Path tmp = Files.createTempDirectory(Paths.get("target"), "export");
        org.geoserver.data.util.IOUtils.decompress(
            new ByteArrayInputStream(response.getContentAsByteArray()), tmp.toFile());

        assertTrue(tmp.resolve("bundle.json").toFile().exists());
    }

    @Test
    public void testWorkspaceImport() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        createMultiPartFormContent(request, "form-data; name=\"file\"; filename=\"sf.zip\"", "application/zip",
            doWorkspaceExport("sf").getContentAsByteArray());

        Catalog cat = getCatalog();
        assertNull(cat.getLayerByName("gs:PrimitiveGeoFeature"));

        MockHttpServletResponse response = new MockHttpServletResponse();
        WorkspaceController ctrl = new WorkspaceController(getGeoServer(), new RecentObjectCache());
        ctrl.inport("gs", request, response);

        assertNotNull(cat.getLayerByName("gs:PrimitiveGeoFeature"));
    }

    public JSONObj createConnectionParameters(Map connectionParameters) throws IOException {
        JSONObj obj = new JSONObj();
        for (Object key : connectionParameters.keySet()) {
            obj.put(key.toString(), connectionParameters.get(key).toString());
        }
        
        return obj;
    }
    protected DataStoreInfo createH2DataStore(String wsName, String dsName) {
        //create a datastore to import into
        Catalog cat = getCatalog();

        WorkspaceInfo ws = wsName != null ? cat.getWorkspaceByName(wsName) : cat.getDefaultWorkspace();
        DataStoreInfo ds = cat.getFactory().createDataStore();
        ds.setWorkspace(ws);
        ds.setName(dsName);
        ds.setType("H2");

        Map params = new HashMap();
        params.put("database", getTestData().getDataDirectoryRoot().getPath()+"/" + dsName);
        params.put("dbtype", "h2");
        ds.getConnectionParameters().putAll(params);
        ds.setEnabled(true);
        cat.add(ds);
        
        return ds;
    }
    protected Connection getConnection(DataStoreInfo ds) throws Exception {
        Map p = ds.getConnectionParameters();
        Class.forName((String)p.get("driver"));
        
        String url = (String) p.get("url");
        String user = (String) p.get("username");
        String passwd = (String) p.get("password");
        
        return DriverManager.getConnection(url, user, passwd);
    }
    protected void populateDatabase(DataStoreInfo ds) throws Exception {
        Connection conn = getConnection(ds);

        if (conn == null) {
            return;
        }

        // read the script and run the setup commands
        Statement st = conn.createStatement();
        runSafe("DELETE FROM GEOMETRY_COLUMNS WHERE F_TABLE_NAME = 'ft1'", st);

        runSafe("DROP TABLE \"ft1\"", st);
        runSafe("DROP TABLE \"ft2\"", st);
        runSafe("DROP TABLE \"ft3\"", st);
    }
    
    MockHttpServletResponse doWorkspaceExport(String wsName) throws Exception {
        WorkspaceController ctrl = new WorkspaceController(getGeoServer(), new RecentObjectCache());

        MockHttpServletResponse response = new MockHttpServletResponse();
        ctrl.export(wsName, response);

        return response;
    }

    void createMultiPartFormContent(MockHttpServletRequest request, String contentDisposition, String contentType,
        byte[] content) throws Exception {
        MimeMultipart body = new MimeMultipart();
        request.setContentType(body.getContentType());
        InternetHeaders headers = new InternetHeaders();
        headers.setHeader("Content-Disposition", contentDisposition);
        headers.setHeader("Content-Type", contentType);
        body.addBodyPart(new MimeBodyPart(headers, content ));

        ByteArrayOutputStream bout = new ByteArrayOutputStream();
        body.writeTo(bout);
        request.setContent(bout.toByteArray());
    }

    @Test
    public void testCreateLayerFromCopy() throws Exception {
        Catalog catalog = getCatalog();
        assertNull(catalog.getLayerByName("sf:foo"));

        JSONObj obj = new JSONObj();
        obj.put("name", "foo");
        obj.putObject("layer")
            .put("name", "PrimitiveGeoFeature")
            .put("workspace", "sf");

        com.mockrunner.mock.web.MockHttpServletResponse resp =
            postAsServletResponse("/app/api/layers/sf", obj.toString(), MediaType.APPLICATION_JSON_VALUE);
        assertEquals(201,resp.getStatusCode());

        assertNotNull(catalog.getLayerByName("sf:foo"));
    }

    @Test
    public void testCreateLayerFromResource() throws Exception {
        Catalog catalog = getCatalog();
        assertNull(catalog.getLayerByName("sf:foo"));

        JSONObj obj = new JSONObj();
        obj.put("name", "foo");
        obj.putObject("resource")
            .put("name", "PrimitiveGeoFeature")
            .put("store", "sf")
            .put("workspace", "sf");

        com.mockrunner.mock.web.MockHttpServletResponse resp =
                postAsServletResponse("/app/api/layers/sf", obj.toString(), MediaType.APPLICATION_JSON_VALUE);
        assertEquals(resp.getStatusCode(), 201);

        assertNotNull(catalog.getLayerByName("sf:foo"));
    }

    @Test
    public void testCreateLayerFromRasterResource() throws Exception {
        Catalog catalog = getCatalog();
        assertNull(catalog.getLayerByName("cdf:foo"));
        assertNotNull(catalog.getLayerByName("cdf:usa"));

        JSONObj obj = new JSONObj();
        obj.put("name", "foo");
        obj.putObject("resource")
                .put("name", "usa")
                .put("store", "usa")
                .put("workspace", "cdf");

        com.mockrunner.mock.web.MockHttpServletResponse resp =
            postAsServletResponse("/app/api/layers/cdf", obj.toString(), MediaType.APPLICATION_JSON_VALUE);
        assertEquals(resp.getStatusCode(), 201);

        assertNotNull(catalog.getLayerByName("cdf:foo"));

    }
}
