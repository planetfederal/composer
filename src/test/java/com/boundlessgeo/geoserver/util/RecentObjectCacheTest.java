package com.boundlessgeo.geoserver.util;

import com.boundlessgeo.geoserver.util.RecentObjectCache.Ref;
import org.geoserver.catalog.LayerGroupInfo;
import org.geoserver.catalog.LayerInfo;
import org.junit.Test;

import java.util.Iterator;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class RecentObjectCacheTest {

    @Test
    public void testList() {
        RecentObjectCache cache = new RecentObjectCache();

        cache.add(LayerGroupInfo.class, map("one"));
        cache.add(LayerGroupInfo.class, map("two"));
        cache.add(LayerGroupInfo.class, map("three"));

        Iterator<Ref> it = cache.list(LayerGroupInfo.class).iterator();
        assertTrue(it.hasNext());
        assertEquals("three", it.next().id);
        assertTrue(it.hasNext());
        assertEquals("two", it.next().id);
        assertTrue(it.hasNext());
        assertEquals("one", it.next().id);
    }

    LayerGroupInfo map(String id) {
        LayerGroupInfo map = mock(LayerGroupInfo.class);
        when(map.getId()).thenReturn(id);
        return map;
    }
}
