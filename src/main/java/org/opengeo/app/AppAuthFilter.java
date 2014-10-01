package org.opengeo.app;

import com.google.common.base.Function;
import com.google.common.collect.Lists;
import org.geoserver.filters.GeoServerFilter;
import org.geoserver.platform.GeoServerExtensions;
import org.geoserver.security.GeoServerSecurityFilterChain;
import org.geoserver.security.GeoServerSecurityManager;
import org.geoserver.security.RequestFilterChain;
import org.geoserver.security.filter.GeoServerCompositeFilter;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

import javax.annotation.Nullable;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import static org.geoserver.security.GeoServerSecurityFilterChain.DEFAULT_CHAIN;
import static org.geoserver.security.GeoServerSecurityFilterChain.DEFAULT_CHAIN_NAME;
import static org.geoserver.security.GeoServerSecurityFilterChain.WEB_CHAIN_NAME;
import static org.geoserver.security.GeoServerSecurityFilterChain.WEB_LOGIN_CHAIN_NAME;
import static org.geoserver.security.GeoServerSecurityFilterChain.WEB_LOGOUT_CHAIN_NAME;

/**
 * Authenticates the backend service for the webapp by reusing the web filter chain.
 */
@Component
public class AppAuthFilter implements GeoServerFilter {

    static final Pattern LOGIN_RE = Pattern.compile("/api/login/?");
    static final Pattern LOGOUT_RE = Pattern.compile("/api/logout/?");

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) servletRequest;
        HttpServletResponse res = (HttpServletResponse) servletResponse;
        String path = req.getPathInfo();

        if (req.getServletPath().startsWith("/app") && path.startsWith("/api")) {

            if ("POST".equalsIgnoreCase(req.getMethod()) && LOGIN_RE.matcher(path).matches()) {
                // hack: we have to jump through a few hoops to piggy back on the geoserver web auth:
                // 1. we fake the request path to fool the security filter
                // 2. we ignore redirects
                boolean success = runSecurityFilters(new HttpServletRequestWrapper(req) {
                    @Override
                    public String getServletPath() {
                        return "";
                    }

                    @Override
                    public String getPathInfo() {
                        return "/j_spring_security_check";
                    }
                }, new HttpServletResponseWrapper(res) {
                    @Override
                    public void sendRedirect(String location) throws IOException {
                    }
                }, WEB_LOGIN_CHAIN_NAME);

                if (success) {
                    filterChain.doFilter(servletRequest, servletResponse);
                }
                else {
                    res.setStatus(401);
                }

            }
            else if (LOGOUT_RE.matcher(path).matches()) {
                // invalidate the session if it exists
                HttpSession session = req.getSession(false);
                if (session != null) {
                    session.invalidate();
                }
            }
            else {
                // two modes of authentication, basic vs form.
                String chainName = req.getHeader("Authorization") != null ? DEFAULT_CHAIN_NAME : WEB_CHAIN_NAME;
                if (runSecurityFilters(req, res, chainName)) {
                    filterChain.doFilter(servletRequest, servletResponse);
                }
                else {
                    res.setStatus(401);
                }
            }
        }
        else {
            filterChain.doFilter(servletRequest, servletResponse);
        }
    }

    boolean isAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken);
    }

    boolean runSecurityFilters(HttpServletRequest req, HttpServletResponse res, String... chainNames)
        throws IOException, ServletException {
        final GeoServerSecurityManager secMgr = GeoServerExtensions.bean(GeoServerSecurityManager.class);
        GeoServerSecurityFilterChain secFilterChain =
            new GeoServerSecurityFilterChain(secMgr.getSecurityConfig().getFilterChain());

        List<Filter> filters = new ArrayList<Filter>();
        for (String chainName : chainNames) {
            RequestFilterChain reqFilterChain = secFilterChain.getRequestChainByName(chainName);
            filters.addAll(Lists.transform(reqFilterChain.getCompiledFilterNames(), new Function<String, Filter>() {
                @Override
                public Filter apply(@Nullable String s) {
                    try {
                        return secMgr.loadFilter(s);
                    } catch (IOException e) {
                        //TODO: something better here
                        throw new RuntimeException("Unable to load security filter:" + s);
                    }
                }
            }));
        }

        GeoServerCompositeFilter compFilter = new GeoServerCompositeFilter();
        compFilter.setNestedFilters(filters);
        compFilter.doFilter(req, res, new FilterChain() {
            @Override
            public void doFilter(ServletRequest request, ServletResponse response) throws IOException, ServletException {
            }
        });

        return isAuthenticated();
    }

    @Override
    public void destroy() {
    }
}
