package org.opengeo.app;

import com.google.common.base.Predicate;
import com.google.common.collect.Iterables;
import org.apache.commons.io.IOUtils;
import org.geoserver.catalog.StyleHandler;
import org.geoserver.config.GeoServer;
import org.geoserver.platform.GeoServerExtensions;
import org.geoserver.platform.resource.Resource;
import org.geoserver.ysld.YsldHandler;
import org.geotools.styling.NamedLayer;
import org.geotools.styling.PointSymbolizer;
import org.geotools.styling.Style;
import org.geotools.styling.StyledLayerDescriptor;
import org.geotools.ysld.Ysld;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import javax.annotation.Nullable;

import java.io.ByteArrayOutputStream;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public class LayerControllerTest {

    @Mock
    GeoServer geoServer;

    @InjectMocks
    LayerController ctrl;

    MockMvc mvc;

    @Before
    public void setUpAppContext() {
        WebApplicationContext appContext = mock(WebApplicationContext.class);
        when(appContext.getBeanNamesForType(StyleHandler.class)).thenReturn(new String[]{"ysldHandler"});
        when(appContext.getBean("ysldHandler")).thenReturn(new YsldHandler());

        new GeoServerExtensions().setApplicationContext(appContext);
    }

    @Before
    public void setUpMVC() {
        MockitoAnnotations.initMocks(this);

        mvc = MockMvcBuilders.standaloneSetup(ctrl).setMessageConverters(
                new JSONMessageConverter(), new ResourceMessageConverter(),
                new YsldMessageConverter(), new ByteArrayHttpMessageConverter()).build();
    }

    @Test
    public void testList() throws Exception {
        MockGeoServer.get().catalog()
            .workspace("foo", "http://scratch.org", true)
                .layer("one")
                  .featureType().defaults().workspace()
                .layer("two")
                  .featureType().defaults().workspace()
            .geoServer().build(geoServer);


        MvcResult result = mvc.perform(get("/backend/layers/foo"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andReturn();

        JSONArr arr = JSONWrapper.read(result.getResponse().getContentAsString()).toArray();
        assertEquals(arr.size(), 2);

        Iterables.find(arr, new Predicate<Object>() {
            @Override
            public boolean apply(@Nullable Object o) {
                return "one".equals(JSONWrapper.wrap(o).toObject().str("name"));
            }
        });
        Iterables.find(arr, new Predicate<Object>() {
            @Override
            public boolean apply(@Nullable Object o) {
                return "two".equals(JSONWrapper.wrap(o).toObject().str("name"));
            }
        });
    }

    @Test
    public void testGet() throws Exception {
        GeoServer gs = MockGeoServer.get().catalog()
            .workspace("foo", "http://scratch.org", true)
                .layer("one")
                .featureType().defaults()
            .geoServer().build(geoServer);

        MvcResult result = mvc.perform(get("/backend/layers/foo/one"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andReturn();

        JSONObj obj = JSONWrapper.read(result.getResponse().getContentAsString()).toObject();
        assertEquals("one", obj.str("name"));
        assertEquals("foo", obj.str("workspace"));
        assertEquals("vector", obj.str("type"));

        assertEquals("EPSG:4326", obj.object("proj").str("srs"));

        assertEquals(-180d, obj.object("bbox").object("native").doub("west"), 0.1);
        assertEquals(-90d, obj.object("bbox").object("native").doub("south"), 0.1);
        assertEquals(180d, obj.object("bbox").object("native").doub("east"), 0.1);
        assertEquals(90d, obj.object("bbox").object("native").doub("north"), 0.1);
        assertEquals(0d, obj.object("bbox").object("native").array("center").doub(0), 0.1);
        assertEquals(0d, obj.object("bbox").object("native").array("center").doub(1), 0.1);

        assertEquals(-180d, obj.object("bbox").object("lonlat").doub("west"), 0.1);
        assertEquals(-90d, obj.object("bbox").object("lonlat").doub("south"), 0.1);
        assertEquals(180d, obj.object("bbox").object("lonlat").doub("east"), 0.1);
        assertEquals(90d, obj.object("bbox").object("lonlat").doub("north"), 0.1);
        assertEquals(0d, obj.object("bbox").object("lonlat").array("center").doub(0), 0.1);
        assertEquals(0d, obj.object("bbox").object("lonlat").array("center").doub(1), 0.1);
    }

    @Test
    public void testGetStyle() throws Exception {
        MockGeoServer.get().catalog()
          .workspace("foo", "http://scratch.org", true)
            .layer("one")
              .style().point()
          .geoServer().build(geoServer);

        MvcResult result = mvc.perform(get("/backend/layers/foo/one/style"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(YsldMessageConverter.MEDIA_TYPE))
            .andReturn();

        StyledLayerDescriptor sld = Ysld.parse(result.getResponse().getContentAsString());
        Style style = ((NamedLayer)sld.layers().get(0)).getStyles()[0];

        assertTrue(style.featureTypeStyles().get(0).rules().get(0).symbolizers().get(0) instanceof PointSymbolizer);
    }

    @Test
    public void testGetStyleRaw() throws Exception {
        MockGeoServer.get().catalog()
          .resources()
            .resource("workspaces/foo/styles/one.yaml", "title: raw")
          .geoServer().catalog()
            .workspace("foo", "http://scratch.org", true)
              .layer("one")
                .style().ysld("one.yaml")
          .geoServer().build(geoServer);

        MvcResult result = mvc.perform(get("/backend/layers/foo/one/style"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(YsldMessageConverter.MEDIA_TYPE))
                .andReturn();

        assertEquals("title: raw", result.getResponse().getContentAsString());
    }

    @Test
    public void testPutStyle() throws Exception {
        MockGeoServer.get().catalog()
            .resources()
                .resource("workspaces/foo/styles/one.yaml", "title: blah")
            .geoServer().catalog()
                .workspace("foo", "http://scratch.org", true)
                   .layer("one")
                      .style().ysld("one.yaml")
            .geoServer().build(geoServer);


        MockHttpServletRequestBuilder req = put("/backend/layers/foo/one/style")
            .contentType(YsldMessageConverter.MEDIA_TYPE)
            .content("title: raw");

        MvcResult result = mvc.perform(req)
            .andExpect(status().isOk())
            .andReturn();

        Resource r = geoServer.getCatalog().getResourceLoader().get("workspaces/foo/styles/one.yaml");
        assertEquals("title: raw", toString(r));
    }

    String toString(Resource r) {
        return new String(((ByteArrayOutputStream)r.out()).toByteArray());
    }
}
