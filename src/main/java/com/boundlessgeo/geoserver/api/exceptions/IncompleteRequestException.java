/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Payment Required (402) error used to indicate an incomplete request.
 */
@ResponseStatus(value = HttpStatus.PAYMENT_REQUIRED)
public class IncompleteRequestException extends RuntimeException {

    public IncompleteRequestException(String message) {
        this(message, null);
    }

    public IncompleteRequestException(String message, Throwable cause) {
        super(message, cause);
    }
}
