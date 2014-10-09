/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver;

import java.io.File;
import java.io.FileInputStream;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.eclipse.jetty.server.Connector;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.bio.SocketConnector;
import org.eclipse.jetty.webapp.WebAppContext;
import org.eclipse.jetty.util.thread.QueuedThreadPool;
import org.eclipse.jetty.xml.XmlConfiguration;

/**
 * Starts up Jetty from the development environment.
 */
public class Start {
    private static final Logger log = org.geotools.util.logging.Logging.getLogger(Start.class.getName());

    public static void main(String[] args) {
        Server jettyServer = null;

        try {
            jettyServer = new Server();

            // don't even think of serving more than XX requests in parallel... we
            // have a limit in our processing and memory capacities
            QueuedThreadPool tp = new QueuedThreadPool();
            tp.setMaxThreads(50);

            SocketConnector conn = new SocketConnector();
            String portVariable = System.getProperty("jetty.port");
            int port = parsePort(portVariable);
            if(port <= 0)
            	port = 8080;
            
            //check for GEOSERVER_DATA_DIR
            String gdd = System.getProperty("GEOSERVER_DATA_DIR");
            if (gdd == null) {
                gdd = new File("data").getCanonicalPath();
                System.setProperty("GEOSERVER_DATA_DIR", gdd);
            }
            
            conn.setPort(port);
            conn.setThreadPool(tp);
            conn.setAcceptQueueSize(100);
            conn.setMaxIdleTime(1000 * 60 * 60);
            conn.setSoLingerTime(-1);
            jettyServer.setConnectors(new Connector[] { conn });

            WebAppContext wah = new WebAppContext();
            wah.setContextPath("/geoserver");
            wah.setWar("src/main/webapp");
            jettyServer.setHandler(wah);
            wah.setTempDirectory(new File("target/work"));

            String jettyConfigFile = System.getProperty("jetty.config.file");
            if (jettyConfigFile != null) {
                log.info("Loading Jetty config from file: " + jettyConfigFile);
                (new XmlConfiguration(new FileInputStream(jettyConfigFile))).configure(jettyServer);
            }

           jettyServer.start();

            // use this to test normal stop behaviour, that is, to check stuff that
            // need to be done on container shutdown (and yes, this will make 
            // jetty stop just after you started it...)
            // jettyServer.stop(); 
        } catch (Exception e) {
            log.log(Level.SEVERE, "Could not start the Jetty server: " + e.getMessage(), e);

            if (jettyServer != null) {
                try {
                    jettyServer.stop();
                } catch (Exception e1) {
                    log.log(Level.SEVERE,
                        "Unable to stop the " + "Jetty server:" + e1.getMessage(), e1);
                }
            }
        }
    }

	private static int parsePort(String portVariable) {
		if(portVariable == null)
			return -1;
	    try {
	    	return Integer.valueOf(portVariable).intValue();
	    } catch(NumberFormatException e) {
	    	return -1;
	    }
	}
}
