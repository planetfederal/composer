package org.opengeo.app;

import org.geoserver.security.GeoServerSecurityManager;
import org.geoserver.security.impl.GeoServerUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.security.Principal;

/**
 * Sends back session info after a successful login.
 */
@Controller
@RequestMapping("/backend/login")
public class LoginController {

    @RequestMapping()
    public @ResponseBody JSONObj handle(HttpServletRequest req, HttpServletResponse res) {
        JSONObj obj = new JSONObj();
        obj.object();

        HttpSession session = req.getSession(false);
        if (session != null) {
            obj.put("session", session.getId());
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Object principal = auth.getPrincipal();
        if (principal instanceof GeoServerUser) {
            GeoServerUser user = (GeoServerUser) principal;
            obj.put("user", user.getUsername());
        }

        return obj.end();
    }
}
