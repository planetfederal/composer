package com.boundlessgeo.geoserver.util;

import org.geoserver.catalog.LayerInfo;
import org.junit.Test;

import java.util.Iterator;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class RecentObjectCacheTest {

    @Test
    public void testList() {
        RecentObjectCache cache = new RecentObjectCache();
        cache.add(LayerInfo.class, "one");
        cache.add(LayerInfo.class, "two");
        cache.add(LayerInfo.class, "three");

        Iterator<String> it = cache.list(LayerInfo.class).iterator();
        assertTrue(it.hasNext());
        assertEquals("three", it.next());
        assertTrue(it.hasNext());
        assertEquals("two", it.next());
        assertTrue(it.hasNext());
        assertEquals("one", it.next());
    }
}
