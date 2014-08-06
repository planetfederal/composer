package org.opengeo.app;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.servlet.http.HttpSession;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Enumeration;

@Controller
@RequestMapping("/backend/sessions")
public class SessionsController {

    @RequestMapping(method= RequestMethod.GET)
    public @ResponseBody JSONObj list() {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy.MM.dd'T'HH:mm:ssZ");

        JSONObj obj = new JSONObj().array();
        for (HttpSession session : AppSessionDebugger.list()) {
            obj.object()
               .put("id", session.getId())
               .put("created", dateFormat.format(new Date(session.getCreationTime())))
               .put("updated", dateFormat.format(new Date(session.getLastAccessedTime())))
               .put("timeout", session.getMaxInactiveInterval());

            Enumeration<String> attNames = session.getAttributeNames();
            obj.object("attributes");
            while (attNames.hasMoreElements()) {
                String attName = attNames.nextElement();
                obj.put(attName, session.getAttribute(attName).toString());
            }
            obj.end();

            obj.end();

        }
        return obj.end();
    }
}
