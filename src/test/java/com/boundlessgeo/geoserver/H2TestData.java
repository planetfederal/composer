package com.boundlessgeo.geoserver;

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.geotools.data.DataStore;
import org.geotools.data.DataStoreFinder;
import org.geotools.data.DataUtilities;
import org.geotools.data.collection.ListFeatureCollection;
import org.geotools.data.simple.SimpleFeatureStore;
import org.geotools.feature.simple.SimpleFeatureBuilder;
import org.geotools.geometry.jts.JTSFactoryFinder;
import org.geotools.jdbc.JDBCDataStore;
import org.opengis.feature.simple.SimpleFeature;
import org.opengis.feature.simple.SimpleFeatureType;

import com.boundlessgeo.geoserver.json.JSONObj;
import com.vividsolutions.jts.io.WKTReader;

public class H2TestData {

    final Logger LOGGER = Logger.getLogger("com.boundlessgeo.geoserver.H2TestData");
    protected DataStore datastore;
    public H2TestData() throws Exception {
        Map<String,Object> params = new HashMap<String,Object>();
        params.put("dbtype", "h2");
        params.put("database", "target/geotools");
        
        datastore = DataStoreFinder.getDataStore(getConnectionParams());
        setUpData();
    }
    public void createDataSource() {
        
    }
    
    public void close() throws Exception {
        try {
            datastore.removeSchema("ft1");
            datastore.removeSchema("ft2");
            datastore.removeSchema("ft3");
        } catch (Exception e) {
          //nothing to remove
        }
        datastore.dispose();
    }
    
    protected void setUpData() throws Exception {
        try {
            datastore.removeSchema("ft1");
            datastore.removeSchema("ft2");
            datastore.removeSchema("ft3");
        } catch (Exception e) {
            //nothing to remove
        }
        
        SimpleFeatureType ft1 = DataUtilities.createType("ft1",
                "the_geom:Point:srid=4326," +
                "name:String");
        SimpleFeatureType ft2 = DataUtilities.createType("ft2",
                "the_geom:Point," +
                "name:String");
        SimpleFeatureType ft3 = DataUtilities.createType("ft3",
                "name:String");
        datastore.createSchema(ft1);
        datastore.createSchema(ft2);
        datastore.createSchema(ft3);
        SimpleFeatureBuilder fb = new SimpleFeatureBuilder(ft1);
        List<SimpleFeature> features = new ArrayList<SimpleFeature>();
        WKTReader reader = new WKTReader(JTSFactoryFinder.getGeometryFactory( null ));
        
        fb.add(reader.read("POINT (0 0)"));
        fb.add("zero");
        features.add(fb.buildFeature("0"));
        fb.add(reader.read("POINT (1 1)"));
        fb.add("one");
        features.add(fb.buildFeature("1"));
        fb.add(reader.read("POINT (2 2)"));
        fb.add("two");
        features.add(fb.buildFeature("2"));
        
        ((SimpleFeatureStore)datastore.getFeatureSource("ft1")).addFeatures(new ListFeatureCollection(ft1, features));
        
        fb = new SimpleFeatureBuilder(ft2);
        features = new ArrayList<SimpleFeature>();
        fb.add(reader.read("POINT (0 0)"));
        fb.add("zero");
        features.add(fb.buildFeature("0"));
        ((SimpleFeatureStore)datastore.getFeatureSource("ft2")).addFeatures(new ListFeatureCollection(ft1, features));

        fb = new SimpleFeatureBuilder(ft3);
        features = new ArrayList<SimpleFeature>();
        fb.add("zero");
        features.add(fb.buildFeature("0"));
        ((SimpleFeatureStore)datastore.getFeatureSource("ft3")).addFeatures(new ListFeatureCollection(ft1, features));
        
    }
    
    protected Connection getConnection() throws Exception {
        return ((JDBCDataStore) datastore).getDataSource().getConnection();
    }
    
    protected Properties createOfflineFixture() {
        Properties fixture = new Properties();
        fixture.put( "driver","org.h2.Driver");
        fixture.put( "url","jdbc:h2:target/geotools");
        fixture.put( "user","geotools");
        fixture.put( "password","geotools");
        return fixture;
    }
    
    public Map<String, Object> getConnectionParams() throws IOException {
        Map<String,Object> params = new HashMap<String,Object>();
        params.put("dbtype", "h2");
        params.put("database", "target/geotools");
        
        return params;
    }
    
    public JSONObj createConnectionParameters() throws IOException {
        JSONObj obj = new JSONObj();
        Map<String, Object> fixture = getConnectionParams();
        for (Object key : fixture.keySet()) {
            obj.put(key.toString(), fixture.get(key).toString());
        }
        return obj;
    }
    
    protected void run(String sql, Statement st) throws SQLException {
        st.execute(sql);
    }

    protected void runSafe(String sql, Statement st) {
        try {
            run(sql, st);
        }
        catch(SQLException e) {
            LOGGER.log(Level.FINE, e.getLocalizedMessage(), e);
        }
    }
}
