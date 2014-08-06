package org.opengeo.app;

import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpOutputMessage;
import org.springframework.http.MediaType;
import org.springframework.http.converter.AbstractHttpMessageConverter;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;

import java.io.IOException;
import java.util.Arrays;

/**
 * Parses/encodes JSON to {@link org.opengeo.app.JSONObj}.
 */
public class JSONObjMessageConverter extends AbstractHttpMessageConverter<JSONObj> {

    public JSONObjMessageConverter() {
        super(MediaType.APPLICATION_JSON);
    }

    @Override
    protected boolean supports(Class<?> clazz) {
        return JSONObj.class.isAssignableFrom(clazz);
    }

    @Override
    protected JSONObj readInternal(Class<? extends JSONObj> clazz, HttpInputMessage message) throws IOException, HttpMessageNotReadableException {
        return null;
    }

    @Override
    protected void writeInternal(JSONObj obj, HttpOutputMessage message) throws IOException, HttpMessageNotWritableException {
        obj.write(message.getBody());
    }
}
