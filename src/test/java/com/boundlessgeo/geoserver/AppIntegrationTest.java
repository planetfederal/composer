/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver;

import com.boundlessgeo.geoserver.api.controllers.IconController;
import com.boundlessgeo.geoserver.api.controllers.ImportController;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;
import net.sf.json.JSONArray;

import net.sf.json.JSONObject;
import org.apache.commons.io.IOUtils;
import org.geoserver.catalog.Catalog;
import org.geoserver.importer.Importer;
import org.geoserver.platform.GeoServerExtensions;
import org.geoserver.platform.resource.Resource;
import org.geoserver.test.GeoServerSystemTestSupport;
import org.junit.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import javax.mail.internet.InternetHeaders;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMultipart;

import java.io.ByteArrayOutputStream;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

public class AppIntegrationTest extends GeoServerSystemTestSupport {

    @Test
    public void testPageLayers() throws Exception {
        JSONObject obj = (JSONObject) getAsJSON(("/app/api/layers/sf"));
        JSONArray arr = obj.getJSONArray("layers");
        assertEquals(3, arr.size());

        obj = (JSONObject) getAsJSON(("/app/api/layers/sf?page=1&pagesize=1"));
        arr = obj.getJSONArray("layers");
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

        MimeMultipart body = new MimeMultipart();
        request.setContentType(body.getContentType());

        InternetHeaders headers = new InternetHeaders();
        headers.setHeader("Content-Disposition", "form-data; name=\"upload\"; filename=\"point.zip\"");
        headers.setHeader("Content-Type", "application/zip");
        body.addBodyPart(new MimeBodyPart(headers,
            IOUtils.toByteArray(getClass().getResourceAsStream("point.shp.zip"))));

        ByteArrayOutputStream bout = new ByteArrayOutputStream();
        body.writeTo(bout);

        request.setContent(bout.toByteArray());
        JSONObj result = ctrl.create("gs", request);

        assertEquals(1, result.array("imported").size());
        JSONObj obj = result.array("imported").object(0);

        assertEquals("gs", obj.object("layer").str("workspace"));
        assertEquals("point", obj.object("layer").str("name"));

        assertNotNull(catalog.getLayerByName("gs:point"));
    }
    

    @Test
    public void testIconsUpload() throws Exception {
        Catalog catalog = getCatalog();
        IconController ctrl = new IconController(getGeoServer());
        
        // test upload
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setContextPath("/geoserver");
        request.setRequestURI("/geoserver/api/icons");
        request.setMethod("post");
        MimeMultipart body = new MimeMultipart();
        request.setContentType(body.getContentType());
        InternetHeaders headers = new InternetHeaders();
        headers.setHeader("Content-Disposition", "form-data; name=\"icon\"; filename=\"STYLE.PROPERTIES\"");
        headers.setHeader("Content-Type", "text/x-java-properties");
        body.addBodyPart(new MimeBodyPart(headers,"square=LINESTRING((0 0,0 1,1 1,1 0,0 0))".getBytes() ));
        
        ByteArrayOutputStream bout = new ByteArrayOutputStream();
        body.writeTo(bout);
        request.setContent(bout.toByteArray());
        
        JSONArr arr = ctrl.create("cite", request );
        System.out.println( arr );
        assertEquals( 1, arr.size() );
        
        Resource r = catalog.getResourceLoader().get("workspaces/cite/styles/STYLE.PROPERTIES");
        assertEquals("created", Resource.Type.RESOURCE, r.getType() );
    }

}
