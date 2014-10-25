package com.boundlessgeo.geoserver.bundle;

import com.google.common.collect.Maps;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.CatalogBuilder;
import org.geoserver.catalog.DataStoreInfo;
import org.geoserver.catalog.FeatureTypeInfo;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.NamespaceInfo;
import org.geoserver.catalog.StyleInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.config.GeoServerDataDirectory;
import org.geoserver.importer.StyleGenerator;
import org.geotools.data.DataStore;
import org.geotools.data.DataStoreFactorySpi;
import org.geotools.data.DataUtilities;
import org.geotools.data.FeatureSource;
import org.geotools.data.FeatureWriter;
import org.geotools.data.Transaction;
import org.geotools.data.h2.H2DataStoreFactory;
import org.geotools.data.property.PropertyDataStoreFactory;
import org.geotools.feature.SchemaException;
import org.opengis.feature.simple.SimpleFeature;
import org.opengis.feature.simple.SimpleFeatureType;

import java.io.File;
import java.io.IOException;
import java.io.Serializable;
import java.util.Map;

/**
 * Helper for building up a real catalog, without the rest of the GeoServer start up that comes with
 * system tests.
 */
public class CatalogCreator {

    Catalog catalog;

    public CatalogCreator(Catalog catalog) {
        this.catalog = catalog;
    }

    public WorkspaceCreator workspace(String name) {
        return new WorkspaceCreator(name, this);
    }

    static class Creator {

        protected Catalog catalog;
        protected GeoServerDataDirectory dataDir;

        Creator(Catalog catalog) {
            this.catalog = catalog;
            dataDir = new GeoServerDataDirectory(catalog.getResourceLoader());
        }

        CatalogBuilder builder() {
            return new CatalogBuilder(catalog);
        }

    }

    static class WorkspaceCreator extends Creator {

        CatalogCreator parent;
        WorkspaceInfo workspace;
        NamespaceInfo namespace;

        WorkspaceCreator(String name, CatalogCreator parent) {
            super(parent.catalog);

            this.parent = parent;

            Catalog cat = parent.catalog;

            workspace = cat.getFactory().createWorkspace();
            workspace.setName(name);

            namespace = cat.getFactory().createNamespace();
            namespace.setPrefix(name);
            namespace.setURI("http://"+name+".org");

            cat.add(workspace);
            cat.add(namespace);
        }

        public CatalogCreator catalog() {
            return parent;
        }

        public DataStoreCreator property(String name) throws IOException {
            File dir = dataDir.get(workspace, "data", name).dir();
            dir.mkdirs();

            Map<String,Serializable> map = Maps.newHashMap();
            map.put(PropertyDataStoreFactory.DIRECTORY.key, dir.getAbsolutePath());
            map.put(PropertyDataStoreFactory.NAMESPACE.key, namespace.getURI());

            return dataStore(name, map, new PropertyDataStoreFactory());
        }

        public DataStoreCreator database(String name) throws IOException {
            File dir = dataDir.get(workspace, "data", name).dir();
            dir.mkdirs();

            Map<String,Serializable> map = Maps.newHashMap();
            map.put(H2DataStoreFactory.DBTYPE.key, "h2");
            map.put(H2DataStoreFactory.DATABASE.key, new File(dir, name +".db").getPath());
            map.put(H2DataStoreFactory.NAMESPACE.key, namespace.getURI());

            return dataStore(name, map, new H2DataStoreFactory());
        }

        DataStoreCreator dataStore(String name, Map<String,Serializable> params, DataStoreFactorySpi dsFactory) {
            return new DataStoreCreator(name, params, dsFactory, this);
        }
    }

    static class DataStoreCreator extends Creator {

        WorkspaceCreator parent;
        DataStoreInfo store;

        DataStoreCreator(String name, Map<String,Serializable> params, DataStoreFactorySpi dsFactory,
             WorkspaceCreator parent) {
            super(parent.catalog);
            this.parent = parent;

            Catalog cat = parent.catalog().catalog;
            store = cat.getFactory().createDataStore();
            store.setName(name);
            store.setWorkspace(parent.workspace);
            store.setEnabled(true);
            store.getConnectionParameters().putAll(params);
            store.setType(dsFactory.getDisplayName());

            cat.add(store);
        }

        public FeatureTypeCreator featureType(String name, String spec, Iterable<Map<String,Object>> data)
            throws IOException {
            return new FeatureTypeCreator(name, spec, data, this);
        }

    }

    static class FeatureTypeCreator extends Creator {

        DataStoreCreator parent;
        FeatureTypeInfo featureType;
        LayerInfo layer;

        FeatureTypeCreator(String name, String spec, Iterable<Map<String,Object>> data, DataStoreCreator parent)
            throws IOException {

            super(parent.catalog);
            this.parent = parent;

            SimpleFeatureType schema = null;
            try {
                schema = DataUtilities.createType(name, spec);
            } catch (SchemaException e) {
                throw new IOException(e);
            }
            DataStore dataStore = (DataStore) parent.store.getDataStore(null);
            dataStore.createSchema(schema);

            FeatureWriter<SimpleFeatureType, SimpleFeature> w =
                dataStore.getFeatureWriterAppend(name, Transaction.AUTO_COMMIT);
            for (Map<String,Object> map : data) {
                SimpleFeature f = w.next();
                for (Map.Entry<String,Object> kvp : map.entrySet()) {
                    f.setAttribute(kvp.getKey(), kvp.getValue());
                }

                w.write();
            }
            w.close();

            CatalogBuilder builder = builder();
            builder.setStore(parent.store);

            FeatureSource<?,?> source = dataStore.getFeatureSource(name);
            featureType = builder.buildFeatureType(source);
            builder.setupBounds(featureType, source);

            catalog.add(featureType);

        }

        public FeatureTypeCreator layer() throws IOException {
            return layer(false);
        }

        public FeatureTypeCreator layer(boolean globalStyle) throws IOException {
            layer = builder().buildLayer(featureType);

            StyleInfo style = newStyle(globalStyle);
            layer.setDefaultStyle(style);

            catalog.add(style);
            catalog.add(layer);

            return this;
        }

        public FeatureTypeCreator style(boolean global) throws IOException {
            StyleInfo style = newStyle(global);
            catalog.add(style);

            layer.getStyles().add(style);
            return this;
        }

        StyleInfo newStyle(boolean global) throws IOException {
            StyleGenerator styleGen = new StyleGenerator(catalog);
            if (!global) {
                styleGen.setWorkspace(parent.parent.workspace);
            }

            return styleGen.createStyle(featureType);
        }

        public DataStoreCreator store() {
            return parent;
        }
    }
}
