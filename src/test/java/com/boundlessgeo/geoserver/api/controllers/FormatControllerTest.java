package com.boundlessgeo.geoserver.api.controllers;

import com.boundlessgeo.geoserver.api.converters.JSONMessageConverter;
import com.boundlessgeo.geoserver.api.converters.ResourceMessageConverter;
import com.boundlessgeo.geoserver.api.converters.YsldMessageConverter;
import com.boundlessgeo.geoserver.api.exceptions.NotFoundException;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;
import com.google.common.base.Predicate;
import com.google.common.base.Predicates;
import com.google.common.collect.Iterators;
import org.geoserver.catalog.SLDHandler;
import org.geoserver.catalog.StyleHandler;
import org.geoserver.config.GeoServer;
import org.geoserver.platform.GeoServerExtensions;
import org.geoserver.ysld.YsldHandler;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import javax.annotation.Nullable;

import java.util.NoSuchElementException;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class FormatControllerTest {

    @Mock
    GeoServer geoServer;

    @InjectMocks
    FormatController ctrl;

    @Before
    public void setUpAppContext() {
        WebApplicationContext appContext = mock(WebApplicationContext.class);
        new GeoServerExtensions().setApplicationContext(appContext);
    }

    @Before
    public void setUpUpContextAndMVC() {
        MockitoAnnotations.initMocks(this);
//        mvc = MockMvcBuilders.standaloneSetup(ctrl)
//            .setMessageConverters(new JSONMessageConverter());
//            .build();
    }

    @Test
    public void testList() {
        ctrl = new FormatController(geoServer);

        JSONArr all = ctrl.list();
        assertTrue(all.size() > 0);
        Iterators.find(all.iterator(), nameIs("shapefile"));
        Iterators.find(all.iterator(), Predicates.and(nameIs("h2"), typeIs("database")));
    }

    @Test
    public void testGet() {
        ctrl = new FormatController(geoServer);

        JSONObj obj = ctrl.get("shapefile");
        assertEquals("shapefile", obj.get("name"));
        assertEquals("vector", obj.get("kind"));
        assertEquals("file", obj.get("type"));

        obj = ctrl.get("h2");
        assertEquals("h2", obj.get("name"));
        assertEquals("vector", obj.get("kind"));
        assertEquals("database", obj.get("type"));

        obj = ctrl.get("geotiff");
        assertEquals("geotiff", obj.get("name"));
        assertEquals("raster", obj.get("kind"));
        assertEquals("file", obj.get("type"));

        obj = ctrl.get("wms");
        assertEquals("wms", obj.get("name"));
        assertEquals("service", obj.get("kind"));

        try {
            ctrl.get("foo");
            fail();
        }
        catch(NotFoundException e) {
        }
    }

    Predicate<Object> nameIs(final String name) {
        return new Predicate<Object>() {
            @Override
            public boolean apply(@Nullable Object input) {
                return ((JSONObj)input).str("name").equals(name);
            }
        };
    }

    Predicate<Object> typeIs(final String type) {
        return new Predicate<Object>() {
            @Override
            public boolean apply(@Nullable Object input) {
                return ((JSONObj)input).str("type").equals(type);
            }
        };
    }
}
