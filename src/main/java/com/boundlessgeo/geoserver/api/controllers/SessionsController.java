/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Enumeration;

import javax.servlet.http.HttpSession;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.boundlessgeo.geoserver.AppSessionDebugger;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;

@Controller
@RequestMapping("/api/sessions")
public class SessionsController {

    @RequestMapping(method= RequestMethod.GET)
    public @ResponseBody
    JSONArr list() {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy.MM.dd'T'HH:mm:ssZ");

        JSONArr arr = new JSONArr();
        for (HttpSession session : AppSessionDebugger.list()) {
            JSONObj obj = arr.addObject();
            obj.put("id", session.getId())
               .put("created", dateFormat.format(new Date(session.getCreationTime())))
               .put("updated", dateFormat.format(new Date(session.getLastAccessedTime())))
               .put("timeout", session.getMaxInactiveInterval());

            @SuppressWarnings("unchecked")
            Enumeration<String> attNames = session.getAttributeNames();
            JSONObj atts = obj.putObject("attributes");
            while (attNames.hasMoreElements()) {
                String attName = attNames.nextElement();
                atts.put(attName, session.getAttribute(attName).toString());
            }
        }

        return arr;
    }
}
