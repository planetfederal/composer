/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.bundle;

import com.boundlessgeo.geoserver.json.JSONObj;
import com.boundlessgeo.geoserver.json.JSONWrapper;
import com.google.common.collect.Maps;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.CatalogBuilder;
import org.geoserver.catalog.CatalogInfo;
import org.geoserver.catalog.CoverageInfo;
import org.geoserver.catalog.CoverageStoreInfo;
import org.geoserver.catalog.DataStoreInfo;
import org.geoserver.catalog.FeatureTypeInfo;
import org.geoserver.catalog.Info;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.NamespaceInfo;
import org.geoserver.catalog.ResourceInfo;
import org.geoserver.catalog.StoreInfo;
import org.geoserver.catalog.StyleInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.catalog.util.CloseableIterator;
import org.geoserver.config.GeoServerDataDirectory;
import org.geoserver.config.util.XStreamPersister;
import org.geoserver.config.util.XStreamPersisterFactory;
import org.geoserver.data.util.IOUtils;
import org.geoserver.ows.util.OwsUtils;
import org.geoserver.platform.GeoServerResourceLoader;
import org.geotools.data.DataAccessFactory;
import org.geotools.data.DataAccessFactory.Param;
import org.geotools.data.DataUtilities;
import org.geotools.data.FileDataStoreFactorySpi;
import org.geotools.data.property.PropertyDataStoreFactory;
import org.geotools.data.simple.SimpleFeatureSource;
import org.geotools.geometry.jts.Geometries;
import org.geotools.geopkg.FeatureEntry;
import org.geotools.geopkg.GeoPackage;
import org.geotools.geopkg.GeoPkgDataStoreFactory;
import org.geotools.util.logging.Logging;
import org.opengeo.GeoServerInfo;
import org.opengis.feature.simple.SimpleFeatureType;
import org.opengis.feature.type.FeatureType;
import org.opengis.feature.type.GeometryDescriptor;
import org.opengis.filter.Filter;
import org.vfny.geoserver.util.DataStoreUtils;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.OutputStream;
import java.io.Serializable;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipOutputStream;

import static org.geoserver.catalog.Predicates.*;

/**
 * Exports GeoServer config/data bundle.
 */
public class BundleExporter {

    static Logger LOG = Logging.getLogger(BundleExporter.class);

    Catalog catalog;

    Path temp, work;

    GeoServerDataDirectory sourceDataDir;
    GeoServerDataDirectory exportDataDir;

    XStreamPersister xsp;

    ExportOpts options;
    WorkspaceInfo workspace;

    public BundleExporter(Catalog catalog, ExportOpts options) throws IOException {
        this.catalog = catalog;
        this.options = options;
        this.workspace = options.workspace();

        // create a temp directory for the export
        temp = Files.createTempDirectory(null);
        work = temp.resolve("work");
        work.toFile().mkdirs();

        sourceDataDir = new GeoServerDataDirectory(catalog.getResourceLoader());
        exportDataDir = new GeoServerDataDirectory(new GeoServerResourceLoader(work.toFile()));
        //exportDataDir.setConfigFileExtension("json");

        // config serializer
        xsp = new XStreamPersisterFactory().createXMLPersister();
        xsp.setExcludeIds();
        xsp.setReferenceByName(true);
    }

    public Path root() {
        return exportDataDir.get(workspace).dir().toPath();
    }

    public Path work() {
        return work;
    }

    /**
     * Runs the export.
     *
     * @return The path pointing to the root directory of the bundle.
     */
    public Path run() throws Exception {
        //TODO: layer groups

        persistBundleInfo();
        persist(workspace);

        try (
                CloseableIterator<StoreInfo> sit = catalog.list(StoreInfo.class, equal("workspace", workspace))
        ) {
            while (sit.hasNext()) {
                StoreInfo store = sit.next();

                persist(store);
            }
        }

        return root();
    }

    /**
     * Packages up the export as a zip file.
     *
     * @return The path pointing to the zip file.
     */
    public Path zip() throws IOException {
        Path zip = temp.resolve(options.name()+".zip");
        try (
            OutputStream out =
                new BufferedOutputStream(new FileOutputStream(zip.toFile()));
        ) {
            ZipOutputStream zout = new ZipOutputStream(out);
            try {
                IOUtils.zipDirectory(root().toFile(), zout, null);
            }
            finally {
                zout.flush();
                zout.close();
                out.flush();
            }
        }
        return zip;
    }

    /**
     * Cleans up the temporary space used by the bundle export.
     */
    public void cleanup() throws IOException {
        FileUtils.deleteDirectory(temp.toFile());
    }

    void persistBundleInfo() throws IOException {
        JSONObj obj = new JSONObj();
        obj.put("name", options.name());

        JSONObj meta = obj.putObject("metadata");
        try {
            GeoServerInfo info = new GeoServerInfo(catalog.getResourceLoader());

            GeoServerInfo.BuildInfo suiteInfo = info.suite();
            meta.putObject("suite").put("version", suiteInfo.version()).put("revision", suiteInfo.revision());

            GeoServerInfo.BuildInfo gsInfo = info.geoserver();
            meta.putObject("geoserver").put("version", suiteInfo.version()).put("revision", suiteInfo.revision());

        } catch (Exception e) {
            throw new IOException(e);
        }

        File wsDir = exportDataDir.get(workspace).dir();
        try (
            OutputStream out = new BufferedOutputStream(new FileOutputStream(new File(wsDir, "bundle.json")));
        ) {
            JSONWrapper.write(obj, out);
            out.flush();
        }

    }

    void persist(WorkspaceInfo ws) throws IOException {
        persist(ws, exportDataDir.config(ws).file());

        NamespaceInfo ns = catalog.getNamespaceByPrefix(ws.getName());
        if (ns != null) {
            persist(ns, exportDataDir.config(ns).file());
        }
    }

    void persist(StoreInfo s) throws IOException {
        File storeDir = exportDataDir.get(s).dir();

        // create a "data" directory under the workspace
        File wsDataDir = exportDataDir.get(s.getWorkspace()).get("data").dir();

        //TODO: wms store
        File file = null;
        if (s instanceof CoverageStoreInfo) {
            file = exportDataDir.config((CoverageStoreInfo)s).file();
        }
        else if (s instanceof DataStoreInfo) {
            file = exportDataDir.config((DataStoreInfo)s).file();
        }
        else {
            file = new File(storeDir, "store.xml");
        }

        if (s instanceof DataStoreInfo) {
            DataStoreInfo ds = (DataStoreInfo) s;

            FileParam dataFile = isFileBased(ds);
            if (dataFile != null && options.bounds() == null) {
                // optimize by copying files over directly
                File storeDataDir = new File(wsDataDir, s.getName());
                storeDataDir.mkdirs();

                copyFilesTo(dataFile.file, storeDataDir, ds);

                // update the store configuration to point to the newly copied files
                File newFileRef = null;
                if (dataFile.file.isDirectory()) {
                    newFileRef = storeDataDir;
                }
                else {
                    newFileRef = new File(storeDataDir, dataFile.file.getName());
                }


                // TODO: convert back to whatever format the parameter expects
                DataStoreInfo clone = copy(ds, catalog.getFactory().createDataStore(), DataStoreInfo.class);

                //clone.getConnectionParameters().put(dataFile.param.key, "file:%WORKSPACE%/"+newPath.toString());
                clone.getConnectionParameters().put(dataFile.param.key, toWorkspaceRelativePath(newFileRef));


                s = clone;
            }
            else {
                // copy into a new geopackage
                GeoPackage gpkg = new GeoPackage(new File(wsDataDir, ds.getName()+".gpkg"));
                try {
                    ingestInto(gpkg, ds);
                }
                finally {
                    gpkg.close();
                }

                // update the connection parameters
                DataStoreInfo clone = copy(ds, catalog.getFactory().createDataStore(), DataStoreInfo.class);
                clone.setType("GeoPackage");

                Map<String,Serializable> oldParams = clone.getConnectionParameters();
                Map<String,Serializable> params = Maps.newHashMap();

                params.put(GeoPkgDataStoreFactory.DBTYPE.key, "geopkg");
                params.put(GeoPkgDataStoreFactory.DATABASE.key, toWorkspaceRelativePath(gpkg.getFile()));
                params.put(GeoPkgDataStoreFactory.NAMESPACE.key,
                    (Serializable) GeoPkgDataStoreFactory.NAMESPACE.lookUp(oldParams));

                oldParams.clear();
                oldParams.putAll(params);

                s = clone;
            }
        }
        else if (s instanceof CoverageStoreInfo) {

        }

        persist(s, file);

        try (
            CloseableIterator<ResourceInfo> rit =
                    catalog.list(ResourceInfo.class, equal("store.id", s.getId()))
        ) {
            while(rit.hasNext()) {
                ResourceInfo resource = rit.next();
                persist(resource);
            }
        }
    }

    String toWorkspaceRelativePath(File newFileRef) {
        Path newPath = root().relativize(newFileRef.toPath());
        return "file:%WORKSPACE%/" + newPath.toString();
    }

    FileParam isFileBased(DataStoreInfo ds) throws IOException {
        DataAccessFactory factory = DataStoreUtils.aquireFactory(ds.getConnectionParameters());
        if (factory == null) {
            factory = DataStoreUtils.aquireFactory(ds.getType());
        }

        if (factory == null) {
            throw new IllegalStateException("Unable to obtain datastore factory for: " + ds);
        }

        if (factory instanceof FileDataStoreFactorySpi) {
            // pull out the file
            FileParam fileParam = findFile(ds, factory);
            if (fileParam != null && fileParam.file.exists()) {
                return fileParam;
            }
        }
        else if (factory instanceof PropertyDataStoreFactory) {
            File file = (File) PropertyDataStoreFactory.DIRECTORY.lookUp(ds.getConnectionParameters());
            return new FileParam(file, PropertyDataStoreFactory.DIRECTORY);
        }

        // TODO: more heuristics
        return null;
    }

    FileParam findFile(DataStoreInfo ds, DataAccessFactory factory) {
        Param fileParam = null;
        for (Param p : factory.getParametersInfo()) {
            Class<?> type = p.getType();
            if (File.class.isAssignableFrom(type) || URL.class.isAssignableFrom(type) ||
                URI.class.isAssignableFrom(type)) {
                fileParam = p;
                break;
            }
        }

        if (fileParam == null) {
            return null;
        }

        Object obj = ds.getConnectionParameters().get(fileParam.key);
        File file = toFile(obj);

        return file != null ? new FileParam(file, fileParam) : null;
    }

    File toFile(Object obj) {
        if (obj instanceof File) {
            return (File) obj;
        }
        else if (obj instanceof String) {
            String str = obj.toString();
            if (str.startsWith("file:")) {
                // turn into a url first
                try {
                    return DataUtilities.urlToFile(new URL(str));
                } catch (MalformedURLException e) {
                    // ignore
                }
            }
            return new File(str);
        }
        else if (obj instanceof URL) {
            return DataUtilities.urlToFile((URL)obj);
        }
        else if (obj instanceof URI) {
            try {
                return DataUtilities.urlToFile(((URI)obj).toURL());
            } catch (MalformedURLException e) {
                LOG.log(Level.WARNING, "Unable to turn: " + obj + " into file", e);
            }
        }
        return null;
    }

//    Object to(File file, Class<?> type) {
//        if (String.class.isAssignableFrom(type)) {
//            return file.getPath();
//        }
//        if (URL.class.isAssignableFrom(type)) {
//
//        }
//        else if (URI.class.isAssignableFrom(type)) {
//
//        }
//        return file;
//    }

    void copyFilesTo(File dataFile, File dir, DataStoreInfo store) throws IOException {
        List<File> filesToCopy = new ArrayList<>();
        if (dataFile.isDirectory()) {
            // grab all files for feature types in the store
            for (String featureType : nativeFeatureTypeNames(store)) {
                filesToCopy.addAll(filesWithBasename(dataFile, featureType));
            }
        }
        else {
            // round up all files that have the same base name
            filesToCopy = filesWithBasename(dataFile, FilenameUtils.getBaseName(dataFile.getName()));
        }

        for (File f : filesToCopy) {
            FileUtils.copyFileToDirectory(f, dir);
        }
    }

    void ingestInto(GeoPackage gpkg, DataStoreInfo store) throws IOException {
        try (
            CloseableIterator<FeatureTypeInfo> it =
                catalog.list(FeatureTypeInfo.class, equal("store.id", store.getId()));
        ) {
            while(it.hasNext()) {
                FeatureTypeInfo ft = it.next();
                FeatureType schema = ft.getFeatureType();
                if (!(schema instanceof SimpleFeatureType)) {
                    LOG.warning("Skipping feature type: " + ft.getName() + ", only simple schema are supported");
                    continue;
                }

                FeatureEntry fe = new FeatureEntry();
                fe.setTableName(ft.getName());
                fe.setIdentifier(ft.getTitle());
                fe.setDescription(ft.getAbstract());
                try {
                    fe.setBounds(ft.boundingBox());
                } catch (Exception e) {
                    throw new IOException(e);
                }
                fe.setSrid(srid(ft.getSRS()));

                GeometryDescriptor geom = schema.getGeometryDescriptor();
                if (geom != null) {
                    fe.setGeometryColumn(geom.getLocalName());
                    fe.setGeometryType(Geometries.getForBinding(
                        (Class<? extends com.vividsolutions.jts.geom.Geometry>) geom.getType().getBinding()));
                }

                gpkg.add(fe, (SimpleFeatureSource) ft.getFeatureSource(null, null), Filter.INCLUDE);
            }
        }
    }

    List<String> nativeFeatureTypeNames(DataStoreInfo store) {
        List<String> names = new ArrayList<>();
        try (
            CloseableIterator<FeatureTypeInfo> it =
                catalog.list(FeatureTypeInfo.class, equal("store.id", store.getId()));
        ) {
            while(it.hasNext()) {
                names.add(it.next().getNativeName());
            }
        }
        return names;
    }

    List<File> filesWithBasename(File dir, final String basename) {
        return Arrays.asList(dir.listFiles(new FilenameFilter() {
            @Override
            public boolean accept(File dir, String name) {
                return FilenameUtils.getBaseName(name).equals(basename);
            }
        }));
    }

    static Pattern SRID = Pattern.compile(".*:(\\d+)");

    Integer srid(String srs) {
        Matcher m = SRID.matcher(srs);
        if (m.matches()) {
            return Integer.parseInt(m.group(1));
        }
        return null;
    }

    <T extends Info> T copy(T src, T dst, Class<T> type) {
        OwsUtils.copy(src, dst, type);
        OwsUtils.set(dst, "id", src.getId());
        return dst;
    }

    void persist(ResourceInfo r) throws IOException {
        File dir = exportDataDir.get(r).dir();
        dir.mkdirs();

        File file = null;
        if (r instanceof CoverageInfo) {
            file = exportDataDir.config((CoverageInfo)r).file();
        }
        else if (r instanceof FeatureTypeInfo) {
            file = exportDataDir.config((FeatureTypeInfo)r).file();
        }
        else {
            file = new File(dir, "resource.xml");
        }

        persist(r, file);

        List<LayerInfo> layers = catalog.getLayers(r);
        if (!layers.isEmpty()) {
            persist(layers.get(0));
        }
        else {
            LOG.warning("Resource: " + r.getName() + " has no layer");
        }

    }

    void persist(LayerInfo l) throws IOException {
        persist(l.getDefaultStyle());
        for (StyleInfo s : l.getStyles()) {
            persist(s);
        }
        persist(l, exportDataDir.config(l).file());
    }

    void persist(StyleInfo s) throws IOException {
        // grab the stylsheet
        File styleFile = sourceDataDir.style(s).file();

        // if the style is global, convert it to a workpace local one
        if (s.getWorkspace() == null) {
            s = convertToWorkspaceLocal(s);
        }

        File dir = exportDataDir.get(s).dir();
        dir.mkdirs();

        persist(s, exportDataDir.config(s).file());
        FileUtils.copyFileToDirectory(styleFile, dir);

        //TODO: grab all of the icons
    }

    StyleInfo convertToWorkspaceLocal(StyleInfo s) {
        StyleInfo newStyle = catalog.getFactory().createStyle();
        new CatalogBuilder(catalog).updateStyle(newStyle, s);

        newStyle.setWorkspace(options.workspace());
        return newStyle;
    }

    void persist(CatalogInfo info, File file) throws IOException {
        try (
            OutputStream out = new BufferedOutputStream(new FileOutputStream(file))
        ) {
            xsp.save(info, out);
        }
    }

    static class FileParam {
        final File file;
        final Param param;

        public FileParam(File file, Param param) {
            this.file = file;
            this.param = param;
        }
    }
}
