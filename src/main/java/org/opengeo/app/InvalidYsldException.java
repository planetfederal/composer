package org.opengeo.app;

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
