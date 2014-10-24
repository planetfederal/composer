/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.bundle;

import org.geoserver.catalog.WorkspaceInfo;

/**
 * Options for workspace bundle import.
 */
public class ImportOpts {

    WorkspaceInfo workspace;

    public ImportOpts(WorkspaceInfo workspace) {
        this.workspace = workspace;
    }

    /**
     * Workspace to import into.
     */
    public WorkspaceInfo workspace() {
        return workspace;
    }
}
