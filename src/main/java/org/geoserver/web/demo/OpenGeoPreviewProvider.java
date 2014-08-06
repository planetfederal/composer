/* Copyright (c) 2001 - 2007 TOPP - www.openplans.org. All rights reserved.
 * This code is licensed under the GPL 2.0 license, available at the root
 * application directory.
 */
package org.geoserver.web.demo;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.apache.wicket.model.IModel;
import org.geoserver.catalog.LayerGroupInfo;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.PublishedInfo;
import org.geoserver.web.wicket.GeoServerDataProvider;

/**
 * Provides a filtered, sorted view over the catalog layers.
 * 
 * @author Andrea Aime - OpenGeo
 */
@SuppressWarnings("serial")
public class OpenGeoPreviewProvider extends GeoServerDataProvider<OpenGeoPreviewLayer> {
    public static final Property<OpenGeoPreviewLayer> TYPE = 
        new BeanProperty<OpenGeoPreviewLayer>("type", "type");

    public static final Property<OpenGeoPreviewLayer> NAME = 
        new BeanProperty<OpenGeoPreviewLayer>("name", "name");

    public static final Property<OpenGeoPreviewLayer> TITLE = 
        new BeanProperty<OpenGeoPreviewLayer>("title", "title");

    public static final Property<OpenGeoPreviewLayer> ABSTRACT = 
        new BeanProperty<OpenGeoPreviewLayer>("abstract", "abstract", false);

    public static final Property<OpenGeoPreviewLayer> KEYWORDS = 
        new BeanProperty<OpenGeoPreviewLayer>("keywords", "keywords", false);

    public static final Property<OpenGeoPreviewLayer> LINKS = new PropertyPlaceholder<OpenGeoPreviewLayer>("View");

    @SuppressWarnings("unchecked")
	public static final List<Property<OpenGeoPreviewLayer>> PROPERTIES = 
        Arrays.asList(TYPE, NAME, TITLE, ABSTRACT, KEYWORDS, LINKS); // GEOEXPLORER, OL, GE);

    @Override
    protected List<OpenGeoPreviewLayer> getItems() {
        List<OpenGeoPreviewLayer> result = new ArrayList<OpenGeoPreviewLayer>();

        for (LayerInfo layer : getCatalog().getLayers()) {
            // ask for enabled() instead of isEnabled() to account for disabled resource/store
            if (layer.enabled())
                result.add(new OpenGeoPreviewLayer(layer));
        }

        for (LayerGroupInfo group : getCatalog().getLayerGroups()) {
            if (!LayerGroupInfo.Mode.CONTAINER.equals(group.getMode())) {
                boolean enabled = true;
                //JD: should probably do this recursively, and check for layer groups within the layer 
                // group and check those layers for being enabled/disabled
                for (LayerInfo layer : group.layers()) {
                    // ask for enabled() instead of isEnabled() to account for disabled resource/store
                    enabled &= layer.enabled();
                }
                if (enabled)
                    result.add(new OpenGeoPreviewLayer(group));
            }
        }

        return result;
    }

    @Override
    protected List<Property<OpenGeoPreviewLayer>> getProperties() {
        return PROPERTIES;
    }

    protected IModel<?> newModel(Object object) {
        return new PreviewLayerModel((PreviewLayer) object);
    }
    

}
