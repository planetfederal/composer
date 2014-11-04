/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import com.boundlessgeo.geoserver.api.converters.JSONMessageConverter;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;
import com.boundlessgeo.geoserver.json.JSONWrapper;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.NamespaceInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.config.GeoServer;
import org.geoserver.platform.GeoServerResourceLoader;
import org.geoserver.platform.resource.Resource;
import org.geoserver.platform.resource.Resource.Type;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Date;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.Matchers.isA;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public class WorkspaceControllerTest {

    @Mock
    GeoServer geoServer;

    @InjectMocks
    WorkspaceController ctrl;

    MockMvc mvc;

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);

        mvc = MockMvcBuilders.standaloneSetup(ctrl).setMessageConverters(new JSONMessageConverter()).build();
    }

    @Test
    public void testList() throws Exception {
        MockGeoServer.get().catalog()
            .workspace("foo", "http://scratch.org", true).catalog()
            .workspace("bar", "http://bar.org", false).catalog()
            .geoServer().build(geoServer);

        GeoServerResourceLoader resourceLoader = mock(GeoServerResourceLoader.class);
        when(resourceLoader.get("workspaces/foo/workspace.xml")).thenAnswer(mockResource());
        when(resourceLoader.get("workspaces/bar/workspace.xml")).thenAnswer(mockResource());

        Catalog catalog = geoServer.getCatalog();
        when(catalog.getResourceLoader()).thenReturn(resourceLoader);

        MvcResult result = mvc.perform(get("/api/workspaces"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andReturn();

        JSONArr arr = JSONWrapper.read(result.getResponse().getContentAsString()).toArray();
        assertEquals(2, arr.size());

        JSONObj obj = arr.object(0);
        assertEquals("foo", obj.str("name"));
        assertTrue(obj.bool("default"));
        assertEquals("http://scratch.org", obj.str("uri"));
        assertTrue(obj.has("modified"));
        assertTrue(obj.object("modified").has("timestamp"));
        assertTrue(obj.object("modified").has("pretty"));

        obj = arr.object(1);
        assertEquals("bar", obj.str("name"));
        assertFalse(obj.bool("default"));
        assertEquals("http://bar.org", obj.str("uri"));
        assertTrue(obj.has("modified"));
        assertTrue(obj.object("modified").has("timestamp"));
        assertTrue(obj.object("modified").has("pretty"));
    }

    @Test
    public void testGet() throws Exception {
        MockGeoServer.get().catalog()
            .workspace("foo", "http://scratch.org", true)
                .layer("foo").workspace().catalog()
            .workspace("bar", "http://bar.org", false).catalog()
            .geoServer().build(geoServer);

        GeoServerResourceLoader resourceLoader = mock(GeoServerResourceLoader.class);
        when(resourceLoader.get("workspaces/foo/workspace.xml")).thenAnswer(mockResource());
        when(resourceLoader.get("workspaces/bar/workspace.xml")).thenAnswer(mockResource());

        Catalog catalog = geoServer.getCatalog();
        when(catalog.getResourceLoader()).thenReturn(resourceLoader);

        MvcResult result = mvc.perform(get("/api/workspaces/foo"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andReturn();

        JSONObj obj = JSONWrapper.read(result.getResponse().getContentAsString()).toObject();
        assertEquals("foo", obj.str("name"));
        assertEquals("http://scratch.org", obj.str("uri"));
        assertTrue(obj.bool("default"));

        assertEquals(0, obj.integer("maps").intValue());
        assertEquals(1, obj.integer("layers").intValue());
        assertEquals(0, obj.integer("stores").intValue());

        result = mvc.perform(get("/api/workspaces/bar"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        obj = JSONWrapper.read(result.getResponse().getContentAsString()).toObject();
        assertEquals("bar", obj.str("name"));
        assertEquals("http://bar.org", obj.str("uri"));
        assertFalse(obj.bool("default"));
    }

    @Test
    public void testPost() throws Exception {
        MockGeoServer.get().build(geoServer);

        JSONObj obj = new JSONObj().put("name", "foo").put("uri", "http://foo.org");

        MockHttpServletRequestBuilder request = post("/api/workspaces")
            .contentType(MediaType.APPLICATION_JSON)
            .content(obj.toString());

        MvcResult result = mvc.perform(request)
            .andExpect(status().isCreated())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andReturn();

        Catalog cat = geoServer.getCatalog();
        verify(cat, times(1)).add(isA(WorkspaceInfo.class));
        verify(cat, times(1)).add(isA(NamespaceInfo.class));
    }

    @Test
    public void testPut() throws Exception {
        MockGeoServer.get().catalog()
            .workspace("foo", "http://scratch.org", true).catalog()
            .workspace("bar", "http://bar.org", false).catalog()
            .geoServer().build(geoServer);

        JSONObj obj = new JSONObj().put("name", "blah");

        MockHttpServletRequestBuilder request = put("/api/workspaces/foo")
            .contentType(MediaType.APPLICATION_JSON)
            .content(obj.toString());

        mvc.perform(request)
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andReturn();

        Catalog cat = geoServer.getCatalog();
        verify(cat, times(1)).save(isA(NamespaceInfo.class));
        verify(cat, times(1)).save(isA(NamespaceInfo.class));

        WorkspaceInfo ws = cat.getWorkspaceByName("foo");
        verify(ws, times(1)).setName("blah");
    }

    @Test
    public void testDelete() throws Exception {
        MockGeoServer.get().catalog()
            .workspace("foo", "http://scratch.org", true).catalog()
            .geoServer().build(geoServer);

        mvc.perform(delete("/api/workspaces/foo"))
            .andExpect(status().isOk())
            .andReturn();

        Catalog cat = geoServer.getCatalog();
        verify(cat, times(1)).remove(isA(WorkspaceInfo.class));
    }

    Answer<Resource> mockResource() {
        return new Answer<Resource>() {
            @Override
            public Resource answer(InvocationOnMock invocation) throws Throwable {
                Resource r = mock(Resource.class);
                when(r.getType()).thenReturn(Type.RESOURCE);
                when(r.lastmodified()).thenReturn(new Date().getTime());
                return r;
            }
        };
    }
}
