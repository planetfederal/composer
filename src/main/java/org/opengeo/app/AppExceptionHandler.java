package org.opengeo.app;

import org.geotools.util.logging.Logging;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.yaml.snakeyaml.error.Mark;
import org.yaml.snakeyaml.error.MarkedYAMLException;

import javax.servlet.http.HttpServletResponse;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.logging.Level;
import java.util.logging.Logger;

@ControllerAdvice
public class AppExceptionHandler {

    static Logger LOG = Logging.getLogger(AppExceptionHandler.class);

    public static String trace(Exception e) {
        StringWriter stack = new StringWriter();
        e.printStackTrace(new PrintWriter(stack));
        return stack.toString();
    }

    @ExceptionHandler(Exception.class)
    public @ResponseBody JSONObj error(Exception e, HttpServletResponse response) {

        HttpStatus status = status(e);
        response.setStatus(status.value());

        // log at warning if 500, else debug
        LOG.log(status == HttpStatus.INTERNAL_SERVER_ERROR ? Level.WARNING : Level.FINE, e.getMessage(), e);

        return new JSONObj()
            .put("message", e.getMessage())
            .put("trace", trace(e));
    }

    HttpStatus status(Exception e) {
        ResponseStatus status = e.getClass().getAnnotation(ResponseStatus.class);
        return status != null ? status.value() : HttpStatus.INTERNAL_SERVER_ERROR;
    }
}
