/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver;

import org.geoserver.ows.util.ResponseUtils;
import org.springframework.web.context.support.ServletContextResource;
import org.springframework.web.servlet.DispatcherServlet;
import org.springframework.web.servlet.HandlerAdapter;
import org.springframework.web.servlet.HandlerExecutionChain;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.resource.ResourceHttpRequestHandler;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import javax.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;

/**
 * Custom dispatcher that routes "/app" requests to the static webapp.
 * <p>
 *  This class must be registered in web.xml.
 * </p>
 */
public class AppDispatcher extends DispatcherServlet {

    static final String API_PATH = "/api";
    static final String COMPOSER_PATH = "/composer";

    ResourceHttpRequestHandler appHandler;

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);
        appHandler = new ResourceHttpRequestHandler();

        ServletContextResource composerRoot = new ServletContextResource(config.getServletContext(), "/composer/**");
        appHandler.setApplicationContext(getWebApplicationContext());
        appHandler.setLocations((List)Arrays.asList(composerRoot));

    }

    @Override
    protected void doDispatch(HttpServletRequest request, HttpServletResponse response) throws Exception {
        if (request.getServletPath().startsWith(COMPOSER_PATH) && !request.getPathInfo().startsWith(API_PATH)) {
            String path = request.getPathInfo();

            // handle redirect
            if ("".equals(path)) {
                response.sendRedirect(COMPOSER_PATH.substring(1) + "/");
                return;
            }

            // handle index
            if ("/".equals(path)) {
                // index.html
                path = "/index.html";
            }

            request.setAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE, path);
            appHandler.handleRequest(request, response);
        }
        else {
            super.doDispatch(request, response);
        }
    }

    @Override
    protected HandlerExecutionChain getHandler(HttpServletRequest request) throws Exception {
        String servletPath = request.getServletPath();
        if (servletPath != null && servletPath.startsWith(API_PATH)) {
            //JD: Hack to deal with the GeoServer "advanced dispatch", the point here is that we want to expose
            // the rest api directly "/api"
            request = new HttpServletRequestWrapper(request) {
                @Override
                public String getRequestURI() {
                    return super.getRequestURI().replace(API_PATH, API_PATH + API_PATH);
                }
            };
        }

        return super.getHandler(request);
    }
}
