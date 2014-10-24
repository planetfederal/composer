/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.bundle;

import org.geoserver.catalog.WorkspaceInfo;
import org.geotools.geometry.jts.ReferencedEnvelope;

/**
 * Options for workspace bundle export.
 */
public class ExportOpts {

    WorkspaceInfo workspace;

    String name;
    ReferencedEnvelope bounds;

    public ExportOpts(WorkspaceInfo workspace) {
        this.workspace = workspace;
    }

    /**
     * The workspace being export.
     */
    public WorkspaceInfo workspace() {
        return workspace;
    }

    /**
     * The bounds to clip data to while exporting.
     * <p>
     *  No bounds means export all data.
     * </p>
     */
    public ReferencedEnvelope bounds() {
        return bounds;
    }

    /**
     * Sets the clipping bounds for the export.
     * @see {@link #bounds()}
     */
    public ExportOpts bounds(ReferencedEnvelope bounds) {
        this.bounds = bounds;
        return this;
    }

    /**
     * The name of the exported bundle.
     * <p>
     * Defaults to the workspace name.
     * </p>
     */
    public String name() {
        return name != null ? name : workspace.getName();
    }

    /**
     * Sets the name of the exported bundle.
     * @see {@link #name()}
     */
    public ExportOpts name(String name) {
        this.name = name;
        return this;
    }

}
