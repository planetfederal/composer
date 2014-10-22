package com.boundlessgeo.geoserver.api.controllers;

import com.boundlessgeo.geoserver.api.converters.JSONMessageConverter;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;
import com.boundlessgeo.geoserver.json.JSONWrapper;
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
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class ProjControllerTest {

    @Mock
    GeoServer geoServer;

    @InjectMocks
    ProjController ctrl;

    MockMvc mvc;

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        mvc = MockMvcBuilders.standaloneSetup(ctrl).setMessageConverters(new JSONMessageConverter()).build();
    }

    @Test
    public void testGet() throws Exception {
        MvcResult result = mvc.perform(get("/api/projections/epsg:3005"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        JSONObj proj = JSONWrapper.read(result.getResponse().getContentAsString()).toObject();
        assertEquals("EPSG:3005", proj.str("srs"));
        assertNotNull(proj.str("wkt"));
    }

    @Test
    public void testRecent() throws Exception {
        MvcResult result = mvc.perform(get("/api/projections/recent"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        JSONArr list = JSONWrapper.read(result.getResponse().getContentAsString()).toArray();
        assertTrue(list.size() > 0);

        Iterables.find(list, new Predicate<Object>() {
            @Override
            public boolean apply(@Nullable Object input) {
                return "EPSG:4326".equals(JSONWrapper.wrap(input).toObject().str("srs"));
            }
        });
        Iterables.find(list, new Predicate<Object>() {
            @Override
            public boolean apply(@Nullable Object input) {
                return "EPSG:3857".equals(JSONWrapper.wrap(input).toObject().str("srs"));
            }
        });

    }
}