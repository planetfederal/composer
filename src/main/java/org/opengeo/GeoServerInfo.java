package org.opengeo;

import org.geoserver.ManifestLoader;
import org.geoserver.ManifestLoader.AboutModel;
import org.geoserver.ManifestLoader.AboutModel.ManifestModel;
import org.geoserver.platform.GeoServerResourceLoader;

import java.util.Properties;

/**
 * Class providing info about GeoServer.
 */
public class GeoServerInfo {

    public GeoServerInfo(GeoServerResourceLoader loader) throws Exception {
        new ManifestLoader(loader);
    }

    public BuildInfo suite() throws Exception {
        final Properties props = new Properties();
        props.load(getClass().getResourceAsStream("suite.properties"));
        return new BuildInfo() {
            @Override
            public String version() {
                return props.getProperty("version");
            }

            @Override
            public String revision() {
                return props.getProperty("rev");
            }
        };
    }

    public BuildInfo geoserver() throws Exception {
        AboutModel about = ManifestLoader.getVersions();
        about = about.filterNameByRegex("GeoServer");

        final AboutModel.ManifestModel manifest = about.getManifests().iterator().next();
        return new BuildInfo() {
            @Override
            public String version() {
                return manifest.getEntries().get("Version");
            }

            @Override
            public String revision() {
                return manifest.getEntries().get("Git-Version").substring(0,7);
            }
        };
    }

    public interface BuildInfo {

        String version();
        String revision();
    }
}
