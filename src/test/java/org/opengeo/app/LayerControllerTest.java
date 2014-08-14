package org.opengeo.app;

import com.google.common.base.Predicate;
import com.google.common.collect.Iterables;
import org.geoserver.config.GeoServer;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.annotation.Nullable;

import static org.junit.Assert.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class LayerControllerTest {

    @Mock
    GeoServer geoServer;

    @InjectMocks
    LayerController ctrl;

    MockMvc mvc;

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);

        mvc = MockMvcBuilders.standaloneSetup(ctrl).setMessageConverters(new JSONMessageConverter()).build();
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
        MockGeoServer.get().catalog()
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
}
