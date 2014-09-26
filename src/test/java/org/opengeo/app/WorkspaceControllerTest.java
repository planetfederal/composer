package org.opengeo.app;

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

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
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

        MvcResult result = mvc.perform(get("/backend/workspaces"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andReturn();

        JSONArr arr = JSONWrapper.read(result.getResponse().getContentAsString()).toArray();
        assertEquals(2, arr.size());

        JSONObj obj = arr.object(0);
        assertEquals("foo", obj.str("name"));
        assertTrue(obj.bool("default"));
        assertEquals("http://scratch.org", obj.str("uri"));

        obj = arr.object(1);
        assertEquals("bar", obj.str("name"));
        assertFalse(obj.bool("default"));
        assertEquals("http://bar.org", obj.str("uri"));
    }
}
