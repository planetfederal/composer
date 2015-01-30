/* (c) 2014-2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;
import java.util.logging.Level;

import org.geoserver.data.test.LiveDbmsData;
import org.geoserver.data.test.SystemTestData;
import org.geoserver.test.GeoServerSystemTestSupport;
import com.boundlessgeo.geoserver.json.JSONObj;

public class DbTestSupport extends GeoServerSystemTestSupport {
    
    DbmsTestData dbTestData;
    
    @Override
    public void onSetUp(SystemTestData testData) throws Exception {
        dbTestData = new DbmsTestData(testData.getDataDirectoryRoot(), getFixtureId(), createSql());
        dbTestData.setUp();
    }
    
    protected void buildTestData(SystemTestData testData) throws Exception {
        dbTestData = new DbmsTestData(testData.getDataDirectoryRoot(), getFixtureId(), createSql());
        dbTestData.setUp();
    }
    
    @Override
    public void onTearDown(SystemTestData testData) throws Exception {
        if (dbTestData == null) {
            dbTestData = new DbmsTestData(testData.getDataDirectoryRoot(), getFixtureId(), null);
        }
        if (!isTestDataAvailable()) {
            return;
        }
        Connection conn = dbTestData.getConnection();

        if (conn == null) {
            return;
        }

        // read the script and run the setup commands
        Statement st = conn.createStatement();
        runSafe("DELETE FROM GEOMETRY_COLUMNS WHERE F_TABLE_NAME = 'ft1'", st);

        runSafe("DROP TABLE \"ft1\"", st);
        runSafe("DROP TABLE \"ft2\"", st);
        runSafe("DROP TABLE \"ft3\"", st);
    }
    
    private File createSql() throws IOException {
        //drop old data
        File sql =  File.createTempFile("DbTestSupport", ".sql");
        
        final String nl = ";"+ System.getProperty("line.separator");
        BufferedWriter writer = new BufferedWriter(new FileWriter(sql));
        
        writer.write("DELETE FROM GEOMETRY_COLUMNS WHERE F_TABLE_NAME = 'ft1'"+nl);
        writer.write("DROP TABLE \"ft1\""+nl);
        writer.write("DROP TABLE \"ft2\""+nl);
        writer.write("DROP TABLE \"ft3\""+nl);
        
        writer.write("CREATE TABLE \"ft1\"(" //
                + "\"id\" serial primary key, " //
                + "\"geometry\" geometry, " //
                + "\"stringProperty\" varchar)"+nl);
        writer.write("INSERT INTO GEOMETRY_COLUMNS VALUES('', 'public', 'ft1', 'geometry', 2, '4326', 'POINT')"+nl);
        
        writer.write("INSERT INTO \"ft1\" VALUES(0, ST_GeometryFromText('POINT(0 0)', 4326), 'zero')"+nl); 
        writer.write("INSERT INTO \"ft1\" VALUES(1, ST_GeometryFromText('POINT(1 1)', 4326), 'one')"+nl);
        writer.write("INSERT INTO \"ft1\" VALUES(2, ST_GeometryFromText('POINT(2 2)', 4326), 'two')"+nl);
        
        
        // ft2: like ft1 but no srid registered
        writer.write("CREATE TABLE \"ft2\"(" //
                + "\"id\" serial primary key, " //
                + "\"geometry\" geometry, " //
                + "\"stringProperty\" varchar)"+nl);
        writer.write("INSERT INTO \"ft2\" VALUES(0, ST_GeometryFromText('POINT(0 0)'), 'one')"+nl);
        
        // ft3: like ft1 but no geometry column
        writer.write("CREATE TABLE \"ft3\"(" //
                + "\"id\" serial primary key, " //
                + "\"stringProperty\" varchar)"+nl);
        writer.write("INSERT INTO \"ft3\" VALUES(0, 'zero')"+nl);
        writer.close();
        
        return sql;
    }
    
    public boolean isTestDataAvailable() {
        if (dbTestData == null) {
            return false;
        }
        if (dbTestData.isTestDataAvailable()) {
            //actually try a connection
            try {
                dbTestData.getConnection();
                return true;
            }
            catch(Exception e) {
                LOGGER.log(Level.SEVERE, "Could not obtain connection", e);
            }
        }
        return false;
    }

    

    
    
    protected String getFixtureId() {
        return "postgis";
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

    class DbmsTestData extends LiveDbmsData {

        public DbmsTestData(File dataDirSourceDirectory, String fixtureId, File sqlScript)
            throws IOException {
            super(dataDirSourceDirectory, fixtureId, sqlScript);
            getFilteredPaths().clear();
        }
        
        public Map getConnectionParams() throws IOException {
            Properties props = new Properties();
            FileInputStream fin = new FileInputStream(fixture);
            try {
                props.load(fin);
            }
            finally {
                fin.close();
            }
            
            return new HashMap(props);
        }
        
        public JSONObj createConnectionParameters() throws IOException {
            JSONObj obj = new JSONObj();
            Map fixture = getConnectionParams();
            for (Object key : fixture.keySet()) {
                obj.put(key.toString(), fixture.get(key).toString());
            }
            
            return obj;
        }
        
        public Connection getConnection() throws Exception {
            Map p = getConnectionParams();
            Class.forName((String)p.get("driver"));
            
            String url = (String) p.get("url");
            String user = (String) p.get("username");
            String passwd = (String) p.get("password");
            
            return DriverManager.getConnection(url, user, passwd);
        }
    }
}
