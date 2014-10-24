package org.opengeo;

import com.google.common.io.Files;
import org.apache.commons.io.FileUtils;
import org.geoserver.platform.GeoServerResourceLoader;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.io.IOException;

import static org.junit.Assert.assertNotNull;

public class GeoServerInfoTest {

    GeoServerResourceLoader resourceLoader;
    GeoServerInfo info;

    @Before
    public void setUp() throws Exception {
        resourceLoader = new GeoServerResourceLoader(Files.createTempDir());
        info = new GeoServerInfo(resourceLoader);
    }

    @After
    public void tearDown() throws IOException {
        FileUtils.deleteDirectory(resourceLoader.getBaseDirectory());
    }

    @Test
    public void test() throws Exception {
        assertNotNull(info.suite());
        assertNotNull(info.geoserver());
    }
}
