/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.converters;

import org.apache.commons.io.IOUtils;
import org.geoserver.platform.resource.Resource;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpOutputMessage;
import org.springframework.http.MediaType;
import org.springframework.http.converter.AbstractHttpMessageConverter;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;

import java.io.IOException;
import java.io.InputStream;

/**
 * Message converter that can encode GeoServer resources.
 */
public class ResourceMessageConverter extends AbstractHttpMessageConverter<Resource> {

    public ResourceMessageConverter() {
        super(MediaType.ALL);
    }
    @Override
    protected boolean supports(Class<?> clazz) {
        return Resource.class.isAssignableFrom(clazz);
    }

    @Override
    protected Resource readInternal(Class<? extends Resource> clazz, HttpInputMessage msg) throws IOException, HttpMessageNotReadableException {
        throw new UnsupportedOperationException();
    }

    @Override
    protected void writeInternal(Resource resource, HttpOutputMessage msg) throws IOException, HttpMessageNotWritableException {
        InputStream in = resource.in();
        try {
            IOUtils.copy(in, msg.getBody());
        }
        finally {
            IOUtils.closeQuietly(in);
        }
    }
}
