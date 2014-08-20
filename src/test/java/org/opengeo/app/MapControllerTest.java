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
import static org.junit.Assert.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class MapControllerTest {

    @Mock
    GeoServer geoServer;

    @InjectMocks
    MapController ctrl;

    MockMvc mvc;

    @Before
    public void setUpMVC() {
        MockitoAnnotations.initMocks(this);

        mvc = MockMvcBuilders.standaloneSetup(ctrl).setMessageConverters(new JSONMessageConverter()).build();
    }

    @Test
    public void testList() throws Exception {
        MockGeoServer.get().catalog()
          .workspace("foo", "http://scratch.org", true)
            .map("map1")
              .defaults()
              .layer("one").featureType().defaults().map()
              .layer("two").featureType().defaults().map().workspace()
            .map("map2")
              .defaults()
              .layer("three").featureType().defaults().map()
              .layer("four").featureType().defaults()
          .geoServer().build(geoServer);

        MvcResult result = mvc.perform(get("/backend/maps/foo"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andReturn();

        JSONArr arr = JSONWrapper.read(result.getResponse().getContentAsString()).toArray();
        assertEquals(arr.size(), 2);

        Iterables.find(arr, new Predicate<Object>() {
            @Override
            public boolean apply(@Nullable Object o) {
                return "map1".equals(JSONWrapper.wrap(o).toObject().str("name"));
            }
        });
        Iterables.find(arr, new Predicate<Object>() {
            @Override
            public boolean apply(@Nullable Object o) {
                return "map2".equals(JSONWrapper.wrap(o).toObject().str("name"));
            }
        });
    }

    @Test
    public void testGet() throws Exception {
        GeoServer gs = MockGeoServer.get().catalog()
          .workspace("foo", "http://scratch.org", true)
            .map("map")
              .defaults()
              .layer("one").featureType().defaults().map()
              .layer("two").featureType().defaults()
         .geoServer().build(geoServer);

        MvcResult result = mvc.perform(get("/backend/maps/foo/map"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        JSONObj obj = JSONWrapper.read(result.getResponse().getContentAsString()).toObject();
        assertEquals("map", obj.str("name"));
        assertEquals("foo", obj.str("workspace"));

        assertEquals(-180d, obj.object("bbox").doub("west"), 0.1);
        assertEquals(-90d, obj.object("bbox").doub("south"), 0.1);
        assertEquals(180d, obj.object("bbox").doub("east"), 0.1);
        assertEquals(90d, obj.object("bbox").doub("north"), 0.1);
        assertEquals(0d, obj.object("bbox").array("center").doub(0), 0.1);
        assertEquals(0d, obj.object("bbox").array("center").doub(1), 0.1);

        assertEquals(2, obj.array("layers").size());

        Iterables.find(obj.array("layers"), new Predicate<Object>() {
            @Override
            public boolean apply(@Nullable Object o) {
                return "one".equals(JSONWrapper.wrap(o).toObject().str("name"));
            }
        });
        Iterables.find(obj.array("layers"), new Predicate<Object>() {
            @Override
            public boolean apply(@Nullable Object o) {
                return "two".equals(JSONWrapper.wrap(o).toObject().str("name"));
            }
        });
    }

    @Test
    public void testGetLayers() throws Exception {
        GeoServer gs = MockGeoServer.get().catalog()
            .workspace("foo", "http://scratch.org", true)
                .map("map")
                    .defaults()
                    .layer("one").featureType().defaults().map()
                    .layer("two").featureType().defaults()
            .geoServer().build(geoServer);

        MvcResult result = mvc.perform(get("/backend/maps/foo/map/layers"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andReturn();

        JSONArr arr = JSONWrapper.read(result.getResponse().getContentAsString()).toArray();
        assertEquals(2, arr.size());

        JSONObj obj = arr.object(0);
        assertEquals("one", obj.str("name"));
        assertEquals("vector", obj.str("type"));

        obj = arr.object(1);
        assertEquals("two", obj.str("name"));
        assertEquals("vector", obj.str("type"));
    }

}
