/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.bundle;


import org.apache.commons.io.FileUtils;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.NamespaceInfo;
import org.geoserver.catalog.ResourceInfo;
import org.geoserver.catalog.StoreInfo;
import org.geoserver.catalog.StyleInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.config.GeoServerDataDirectory;
import org.geoserver.config.util.XStreamPersister;
import org.geoserver.config.util.XStreamPersisterFactory;
import org.geoserver.data.util.IOUtils;
import org.geoserver.platform.GeoServerResourceLoader;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileFilter;
import java.io.FileInputStream;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.InputStream;
import java.io.Serializable;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Imports GeoServer config/data bundle.
 */
public class BundleImporter {

    static FileFilter DIRECTORY = new FileFilter() {
        @Override
        public boolean accept(File file) {
            return file.isDirectory();
        }
    };

    static FilenameFilter CONFIG_FILE = new FilenameFilter() {
        @Override
        public boolean accept(File dir, String name) {
            return name.endsWith(".xml") && !name.endsWith(".xml.xml");
        }
    };

    Catalog catalog;
    ImportOpts options;

    WorkspaceInfo workspace;
    NamespaceInfo namespace;

    Path root;
    GeoServerDataDirectory importDataDir;
    GeoServerDataDirectory targetDataDir;

    XStreamPersister xsp;

    public BundleImporter(Catalog catalog, ImportOpts options) throws IOException {
        this.catalog = catalog;
        this.options = options;
        workspace = options.workspace();
        namespace = catalog.getNamespaceByPrefix(workspace.getName());

        // temp directory to unpack
        root = Files.createTempDirectory(null);
        importDataDir = new GeoServerDataDirectory(new GeoServerResourceLoader(root.toFile()));
        targetDataDir = new GeoServerDataDirectory(catalog.getResourceLoader());

        // config deserializer
        xsp = new XStreamPersisterFactory().createXMLPersister();
        xsp.setExcludeIds();
        xsp.setReferenceByName(true);
        xsp.setCatalog(catalog);
    }

    public Path unzip(Path zip) throws IOException {
        try (
            InputStream in = new BufferedInputStream(new FileInputStream(zip.toFile()));
        ) {
            IOUtils.decompress(in, root.toFile());
        }
        return root;
    }

    public void run() throws IOException {
        loadWorkspace(root.toFile());
//        // workspaces
//        File wsRoot = root.resolve("workspaces").toFile();
//        for (File dir : wsRoot.listFiles(DIRECTORY)) {
//            loadWorkspace(dir);
//        }
    }

    void loadStyles(File styleDir) throws IOException {
        for (File f : styleDir.listFiles(CONFIG_FILE)) {
            StyleInfo s = depersist(f, StyleInfo.class);
            s.setWorkspace(workspace);

            //TODO: copy over sld file?
            catalog.add(s);
        }
    }

    void loadWorkspace(File wsDir) throws IOException {
//        WorkspaceInfo ws = depersist(new File(wsDir, "workspace.xml"), WorkspaceInfo.class);
//        catalog.add(ws);
//
//        NamespaceInfo ns = depersist(new File(wsDir, "namespace.xml"), NamespaceInfo.class);
//        catalog.add(ns);

        // data directory
        File dataDir = new File(wsDir, "data");
        if (dataDir.exists()) {
            FileUtils.copyDirectory(dataDir, targetDataDir.get(workspace, "data").dir());
        }

        // styles
        File styleDir = new File(wsDir, "styles");
        if (styleDir.exists()) {
            loadStyles(styleDir);
        }

        //TODO: layer groups

        // stores
        for (File dir : wsDir.listFiles(DIRECTORY)) {
            loadStore(dir, wsDir);
        }
    }

    void loadStore(File storeDir, File wsDir) throws IOException {
        //TODO: wms store
        File file = new File(storeDir, "datastore.xml");
        if (!file.exists()) {
            file = new File(storeDir, "coveragestore.xml");
        }
        if (!file.exists()) {
            file = new File(storeDir, "store.xml");
        }
        if (!file.exists()) {
            return;
        }

        StoreInfo s = depersist(file, StoreInfo.class);
        s.setWorkspace(workspace);
        updateConnectionParams(s);
        catalog.add(s);

        for (File dir : storeDir.listFiles(DIRECTORY)) {
            loadResource(dir, s);
        }

    }

    void updateConnectionParams(StoreInfo s) {
        // update workspace relative paths
        // update namespace uri
        LinkedHashMap<String,Serializable> map = new LinkedHashMap<>();
        for (Map.Entry<String,Serializable> e : s.getConnectionParameters().entrySet()) {
            Serializable value = e.getValue();
            if (value instanceof String && value.toString().contains("%WORKSPACE%")) {
                value = value.toString().replace("%WORKSPACE%", "workspaces/"+workspace.getName());
            }
            if ("namespace".equalsIgnoreCase(e.getKey())) {
                value = namespace.getName();
            }
            map.put(e.getKey(), value);
        }

        s.getConnectionParameters().clear();
        s.getConnectionParameters().putAll(map);
    }

    void loadResource(File resourceDir, StoreInfo s) throws IOException {
        // TODO: wms layer
        File file = new File(resourceDir, "featuretype.xml");
        if (!file.exists()) {
            file = new File(resourceDir, "coverage.xml");
        }
        if (!file.exists()) {
            file = new File(resourceDir, "resource.xml");
        }
        if (!file.exists()) {
            return;
        }

        ResourceInfo r = depersist(file, ResourceInfo.class);
        r.setStore(s);
        r.setNamespace(namespace);
        catalog.add(r);

        File layerFile = new File(resourceDir, "layer.xml");
        LayerInfo l = depersist(layerFile, LayerInfo.class);
        l.setResource(r);

        // have to do a bit more hacking to get the style to resolve properly since it's reference is
        // encoded by name, basically parse the layer.xml and pull out the name and resolve it
        // manually
        resolveStyles(l, layerFile);

        catalog.add(l);
    }

    void resolveStyles(LayerInfo l, File layerFile) throws IOException {
        Document doc = null;
        try {
            doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(layerFile);
        }
        catch(Exception e) {
            throw new IOException(e);
        }

        if (l.getDefaultStyle() == null) {
            NodeList defaultStyles = doc.getDocumentElement().getElementsByTagName("defaultStyle");
            if (defaultStyles.getLength() > 0) {
                String styleName = pullStyleName((Element) defaultStyles.item(0));
                if (styleName != null) {
                    l.setDefaultStyle(catalog.getStyleByName(workspace, styleName));
                }
            }
        }

        NodeList styles = doc.getDocumentElement().getElementsByTagName("styles");
        if (styles.getLength() > 0) {
            l.getStyles().clear();
            for (int i = 0; i < styles.getLength(); i++) {
                Element e = (Element) styles.item(i);
                String styleName = pullStyleName(e);
                if (styleName != null) {
                    StyleInfo style = catalog.getStyleByName(workspace, styleName);
                    if (style != null) {
                        l.getStyles().add(style);
                    }
                }
            }
        }
    }

    String pullStyleName(Element e) {
        NodeList names = e.getElementsByTagName("name");
        if (names.getLength() > 0) {
            String styleName = names.item(0).getTextContent();
            return styleName;
        }
        return null;
    }

    <T> T depersist(File file, Class<T> type) throws IOException {
        try (
            InputStream in = new BufferedInputStream(new FileInputStream(file));
        ) {
            return xsp.load(in, type);
        }
    }
}
