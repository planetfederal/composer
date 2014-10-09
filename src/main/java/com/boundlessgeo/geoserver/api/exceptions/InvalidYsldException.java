/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.exceptions;

import org.yaml.snakeyaml.error.MarkedYAMLException;

import java.util.List;

public class InvalidYsldException extends RuntimeException {

    List<MarkedYAMLException> errors;

    public InvalidYsldException(List<MarkedYAMLException> errors) {
        super("Invalid Ysld");
        this.errors = errors;
    }

    public List<MarkedYAMLException> errors() {
        return errors;
    }
}
