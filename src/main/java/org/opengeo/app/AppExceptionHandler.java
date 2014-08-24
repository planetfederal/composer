package org.opengeo.app;

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

@ControllerAdvice
public class AppExceptionHandler {

    public static String trace(Exception e) {
        StringWriter stack = new StringWriter();
        e.printStackTrace(new PrintWriter(stack));
        return stack.toString();
    }

    @ExceptionHandler(Exception.class)
    public @ResponseBody JSONObj error(Exception e, HttpServletResponse response) {
        response.setStatus(status(e));


        return new JSONObj()
            .put("message", e.getMessage())
            .put("trace", trace(e));
    }

    int status(Exception e) {
        ResponseStatus status = e.getClass().getAnnotation(ResponseStatus.class);
        return status != null ? status.value().value() : HttpStatus.INTERNAL_SERVER_ERROR.value();
    }
}
