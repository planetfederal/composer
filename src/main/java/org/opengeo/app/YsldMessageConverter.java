package org.opengeo.app;

import org.geoserver.ysld.YsldHandler;
import org.geotools.styling.StyledLayerDescriptor;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpOutputMessage;
import org.springframework.http.MediaType;
import org.springframework.http.converter.AbstractHttpMessageConverter;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;

import java.io.IOException;

/**
 * Message converter for Ysld content.
 */
public class YsldMessageConverter extends AbstractHttpMessageConverter<StyledLayerDescriptor> {

    public static final MediaType MEDIA_TYPE = MediaType.valueOf(YsldHandler.MIMETYPE);

    public YsldMessageConverter() {
        super(MediaType.ALL);
    }

    @Override
    protected boolean supports(Class<?> clazz) {
        return StyledLayerDescriptor.class.isAssignableFrom(clazz);
    }

    @Override
    protected StyledLayerDescriptor readInternal(Class<? extends StyledLayerDescriptor> clazz, HttpInputMessage message)
        throws IOException, HttpMessageNotReadableException {
        return new YsldHandler().parse(message.getBody(), null, null, null);
    }

    @Override
    protected void writeInternal(StyledLayerDescriptor sld, HttpOutputMessage message)
        throws IOException, HttpMessageNotWritableException {
        message.getHeaders().setContentType(MEDIA_TYPE);
        new YsldHandler().encode(sld, null, true, message.getBody());
    }
}
