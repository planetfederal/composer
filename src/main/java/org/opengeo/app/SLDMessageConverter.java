package org.opengeo.app;

import org.geoserver.catalog.Styles;
import org.geotools.styling.StyledLayer;
import org.geotools.styling.StyledLayerDescriptor;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpOutputMessage;
import org.springframework.http.MediaType;
import org.springframework.http.converter.AbstractHttpMessageConverter;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;

import java.io.IOException;

public class SLDMessageConverter extends AbstractHttpMessageConverter<StyledLayerDescriptor> {

    public SLDMessageConverter() {
        super(MediaType.ALL);
    }

    @Override
    protected boolean supports(Class<?> clazz) {
        return StyledLayerDescriptor.class.isAssignableFrom(clazz);
    }

    @Override
    protected StyledLayerDescriptor readInternal(Class<? extends StyledLayerDescriptor> clazz, HttpInputMessage message)
        throws IOException, HttpMessageNotReadableException {
        MediaType contentType = message.getHeaders().getContentType();
        return Styles.handler(contentType.toString()).parse(message.getBody(), null, null, null);
    }

    @Override
    protected void writeInternal(StyledLayerDescriptor sld, HttpOutputMessage message)
        throws IOException, HttpMessageNotWritableException {
        MediaType contentType = message.getHeaders().getContentType();
        Styles.handler(contentType.toString()).encode(sld, null, true, message.getBody());
    }
}
