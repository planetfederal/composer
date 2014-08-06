package org.opengeo.app;

import org.springframework.web.context.support.ServletContextResource;
import org.springframework.web.servlet.DispatcherServlet;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.resource.ResourceHttpRequestHandler;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
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

    ResourceHttpRequestHandler appHandler;

    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init(config);
        appHandler = new ResourceHttpRequestHandler();

        ServletContextResource appRoot = new ServletContextResource(config.getServletContext(), "/app/**");
        appHandler.setApplicationContext(getWebApplicationContext());
        appHandler.setLocations((List)Arrays.asList(appRoot));

    }

    @Override
    protected void doDispatch(HttpServletRequest request, HttpServletResponse response) throws Exception {
        if (request.getServletPath().startsWith("/app") && !request.getPathInfo().startsWith("/backend")) {
            String path = request.getPathInfo();

            // handle redirect
            if ("".equals(path)) {
                response.sendRedirect("app/");
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
}
