/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import com.boundlessgeo.geoserver.json.JSONObj;
import org.geoserver.security.impl.GeoServerUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

/**
 * Sends back session info after a successful login.
 */
@Controller
@RequestMapping("/api/login")
public class LoginController {

    @RequestMapping()
    public @ResponseBody
    JSONObj handle(HttpServletRequest req, HttpServletResponse res) {
        JSONObj obj = new JSONObj();

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

        return obj;
    }
}
