/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.converters;

import com.boundlessgeo.geoserver.json.JSONWrapper;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpOutputMessage;
import org.springframework.http.MediaType;
import org.springframework.http.converter.AbstractHttpMessageConverter;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;

import java.io.IOException;

/**
 * Parses/encodes JSON.
 */
public class JSONMessageConverter extends AbstractHttpMessageConverter<JSONWrapper> {

    public JSONMessageConverter() {
        super(MediaType.APPLICATION_JSON);
    }

    @Override
    protected boolean supports(Class<?> clazz) {
        return JSONWrapper.class.isAssignableFrom(clazz);
    }

    @Override
    protected JSONWrapper readInternal(Class<? extends JSONWrapper> clazz, HttpInputMessage message) throws IOException, HttpMessageNotReadableException {
        return JSONWrapper.read(message.getBody());
    }

    @Override
    protected void writeInternal(JSONWrapper obj, HttpOutputMessage message) throws IOException, HttpMessageNotWritableException {
        JSONWrapper.write(obj, message.getBody());
    }
}
