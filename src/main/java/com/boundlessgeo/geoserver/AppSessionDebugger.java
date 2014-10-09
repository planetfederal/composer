/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver;

import org.springframework.stereotype.Component;

import javax.servlet.http.HttpSession;
import javax.servlet.http.HttpSessionEvent;
import javax.servlet.http.HttpSessionListener;
import java.util.LinkedHashMap;
import java.util.TreeMap;

@Component
public class AppSessionDebugger implements HttpSessionListener {
    static TreeMap<String,HttpSession> sessions = new TreeMap<String, HttpSession>();

    @Override
    public void sessionCreated(HttpSessionEvent se) {
        HttpSession session = se.getSession();
        sessions.put(session.getId(), session);
    }

    @Override
    public void sessionDestroyed(HttpSessionEvent se) {
        sessions.remove(se.getSession().getId());
    }

    public static Iterable<HttpSession> list() {
        return sessions.values();
    }
}
