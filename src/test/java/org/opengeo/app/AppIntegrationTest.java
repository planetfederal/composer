package org.opengeo.app;

import net.sf.json.JSON;
import net.sf.json.JSONArray;
import org.geoserver.test.GeoServerSystemTestSupport;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class AppIntegrationTest extends GeoServerSystemTestSupport {

    @Test
    public void testPageLayers() throws Exception {
        JSONArray arr = (JSONArray) getAsJSON(("/app/backend/layers/sf"));
        assertEquals(3, arr.size());

        arr = (JSONArray) getAsJSON(("/app/backend/layers/sf?page=1&pagesize=1"));
        assertEquals(1, arr.size());
    }
}
