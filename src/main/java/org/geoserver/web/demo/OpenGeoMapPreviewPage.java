/* Copyright (c) 2001 - 2007 TOPP - www.openplans.org. All rights reserved.
 * This code is licensed under the GPL 2.0 license, available at the root
 * application directory.
 */
package org.geoserver.web.demo;

import static org.geoserver.ows.util.ResponseUtils.urlEncode;
import static org.geoserver.web.demo.OpenGeoPreviewProvider.LINKS;
import static org.geoserver.web.demo.OpenGeoPreviewProvider.NAME;
import static org.geoserver.web.demo.OpenGeoPreviewProvider.TITLE;
import static org.geoserver.web.demo.OpenGeoPreviewProvider.TYPE;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.logging.Level;

import org.apache.wicket.Component;
import org.apache.wicket.behavior.IBehavior;
import org.apache.wicket.behavior.SimpleAttributeModifier;
import org.apache.wicket.markup.html.WebMarkupContainer;
import org.apache.wicket.markup.html.basic.Label;
import org.apache.wicket.markup.html.image.Image;
import org.apache.wicket.markup.html.link.ExternalLink;
import org.apache.wicket.markup.html.panel.Fragment;
import org.apache.wicket.markup.repeater.RepeatingView;
import org.apache.wicket.model.IModel;
import org.apache.wicket.model.Model;
import org.geoserver.config.GeoServer;
import org.geoserver.web.GeoServerBasePage;
import org.geoserver.web.demo.PreviewLayer.PreviewLayerType;
import org.geoserver.web.wicket.GeoServerDataProvider.Property;
import org.geoserver.web.wicket.GeoServerTablePanel;
import org.geoserver.wfs.WFSGetFeatureOutputFormat;
import org.geoserver.wfs.WFSInfo;
import org.geoserver.wms.GetMapOutputFormat;
import org.geotools.geometry.jts.ReferencedEnvelope;
import org.geotools.referencing.CRS;
import org.opengis.referencing.crs.CoordinateReferenceSystem;

/**
 * Shows a paged list of the available layers and points to previews in various
 * formats
 */
@SuppressWarnings("serial")
public class OpenGeoMapPreviewPage extends GeoServerBasePage {
    private final static LinkTemplate GOOGLE_EARTH_TEMPLATE =
        new StringFormattingLinkTemplate(true, "Google Earth", "../wms/kml?layers=%s");
    private final static LinkTemplate OPENLAYERS_TEMPLATE =
        new WMSLinkTemplate("OpenLayers", false, "&format=application/openlayers");

    private static final List<LinkTemplate> applicationLinkTemplates() {
        CoordinateReferenceSystem EPSG_3857 = null;
        try {
            // NOTE: We need to avoid peforming CRS lookups in static
            // initializer blocks, so we can't just stick this in a static variable
            EPSG_3857 = CRS.decode("EPSG:3857");
        } catch (Exception e) {
            LOGGER.log(Level.FINER, e.getMessage(), e);
        }

        String base = System.getProperty("opengeo.geoexplorer.url", "/geoexplorer")
            .replaceFirst("/$", "");

        List<LinkTemplate> builder = new ArrayList<LinkTemplate>();
        builder.add(OPENLAYERS_TEMPLATE);
        builder.add(GOOGLE_EARTH_TEMPLATE);
        builder.add(new GeoExplorerLinkTemplate(base, EPSG_3857));
        return Collections.unmodifiableList(builder);
    }

    OpenGeoPreviewProvider provider = new OpenGeoPreviewProvider();

    GeoServerTablePanel<OpenGeoPreviewLayer> table;

    public OpenGeoMapPreviewPage() {
        // build the table
        table = new GeoServerTablePanel<OpenGeoPreviewLayer>("table", provider) {

            @Override
            @SuppressWarnings("rawtypes")
            protected Component getComponentForProperty(String id, final IModel itemModel,
                Property<OpenGeoPreviewLayer> property) {
                OpenGeoPreviewLayer layer = (OpenGeoPreviewLayer) itemModel.getObject();

                if (property == TYPE) {
                    Fragment f = new Fragment(id, "iconFragment", OpenGeoMapPreviewPage.this);
                    f.add(new Image("layerIcon", layer.getTypeSpecificIcon()));
                    return f;
                } else if (property == NAME) {
                    return new Label(id, property.getModel(itemModel));
                } else if (property == TITLE) {
                    return new Label(id, property.getModel(itemModel));
                } else if (property == LINKS) {
                    Fragment f = new Fragment(id, "exlink", OpenGeoMapPreviewPage.this);
                    
                    final ExternalLink link = new ExternalLink("goButton", OPENLAYERS_TEMPLATE.linkForLayer(layer));
                    link.setOutputMarkupId(true);
                    link.getMarkupId();
                    
                    WebMarkupContainer selectControl = new WebMarkupContainer("selectControl");
                    selectControl.setOutputMarkupId(true);
                    RepeatingView group = new RepeatingView("group");
                    WebMarkupContainer groupContainer = new WebMarkupContainer(group.newChildId());
                    groupContainer.add(new SimpleAttributeModifier("label", "Applications"));
                    RepeatingView view = new RepeatingView("link");
                    addLinkOptions(applicationLinkTemplates(), layer, view, true);
                    groupContainer.add(view);
                    group.add(groupContainer);

                    groupContainer = new WebMarkupContainer(group.newChildId());
                    groupContainer.add(new SimpleAttributeModifier("label", "WMS Formats"));
                    view = new RepeatingView("link");
                    addLinkOptions(wmsLinkTemplates(), layer, view, false);
                    groupContainer.add(view);
                    group.add(groupContainer);

                    if (layer.getType() == PreviewLayer.PreviewLayerType.Vector) {
                        groupContainer = new WebMarkupContainer(group.newChildId());
                        groupContainer.add(new SimpleAttributeModifier("label", "WFS Formats"));
                        view = new RepeatingView("link");
                        addLinkOptions(wfsLinkTemplates(), layer, view, false);
                        groupContainer.add(view);
                        group.add(groupContainer);
                    }
                    
                    IBehavior linkUpdater = new SimpleAttributeModifier("onchange",
                        "void (document.getElementById('" + selectControl.getMarkupId() + "').value && (document.getElementById('" + link.getMarkupId() + "').href = arguments[0].target.value))");

                    selectControl.add(linkUpdater);
                    selectControl.add(group);
                    f.add(selectControl);
                    f.add(link);
                    return f;
                }
                return null;
            }

        };
        table.setOutputMarkupId(true);
        add(table);
    }

    private List<LinkTemplate> wmsLinkTemplates() {
        List<LinkTemplate> linkTemplates = new ArrayList<LinkTemplate>();
        for (GetMapOutputFormat f : getGeoServerApplication().getBeansOfType(
            GetMapOutputFormat.class)) {
            linkTemplates.add(new WMSLinkTemplate(translate("format.wms.", f.getMimeType()), true,
                "&format=" + f.getMimeType()));
        }
        Collections.sort(linkTemplates, ByLabel);
        return Collections.unmodifiableList(linkTemplates);
    }

    /**
     * Generates the maxFeatures element of the WFS request using the value of 
     * maxNumberOfFeaturesForPreview. Values <= 0 give no limit.
     * @return "&maxFeatures=${maxNumberOfFeaturesForPreview}" or "" if 
     * maxNumberOfFeaturesForPreview <= 0"
     */
    private String getMaxFeatures() {
        GeoServer geoserver = getGeoServer();
        WFSInfo service = geoserver.getService(WFSInfo.class);
        if (service.getMaxNumberOfFeaturesForPreview() > 0) {
            return "&maxFeatures="+service.getMaxNumberOfFeaturesForPreview();
        }
        return "";
    }

    private List<LinkTemplate> wfsLinkTemplates() {
        List<LinkTemplate> linkTemplates = new ArrayList<LinkTemplate>();
        for (WFSGetFeatureOutputFormat format : getGeoServerApplication().getBeansOfType(
            WFSGetFeatureOutputFormat.class)) {
            for (String type : format.getOutputFormats()) {
                linkTemplates.add(new WFSLinkTemplate(translate("format.wfs.", type), true,
		    getMaxFeatures()+"&outputformat=" + urlEncode(type)));
            }
        }
        Collections.sort(linkTemplates, ByLabel);
        return Collections.unmodifiableList(linkTemplates);
    }

    private String translate(final String prefix, final String key) {
        try {
            return getLocalizer().getString(prefix + key, this);
        } catch (Exception e) {
            LOGGER.log(Level.INFO, e.getMessage());
            return key;
        }
    }

    private void addLinkOptions(final List<LinkTemplate> templates,
        final OpenGeoPreviewLayer layer, final RepeatingView view, boolean selectOne) {
        for (LinkTemplate tpl : templates) {
            Label label = new Label(view.newChildId(), new Model<String>(tpl.label()));
            label.add(new SimpleAttributeModifier("value", tpl.linkForLayer(layer)));
            if (selectOne) {
                label.add(new SimpleAttributeModifier("selected", "selected"));
                selectOne = false;
            }
            view.add(label);
        }
    }
    
    private static final Comparator<LinkTemplate> ByLabel = 
        new Comparator<LinkTemplate> () {
            public int compare(LinkTemplate a, LinkTemplate b) {
                return String.CASE_INSENSITIVE_ORDER.compare(a.label(), b.label());
            }
        };

    private static class StringFormattingLinkTemplate implements LinkTemplate, Serializable {
        private final String labelText;
        private final boolean isExternal;
        private final String format;

        public StringFormattingLinkTemplate(final boolean isExternal, final String labelText, final String format) {
            this.isExternal = isExternal;
            this.labelText = labelText;
            this.format = format;
        }

        public boolean isExternalLink(final OpenGeoPreviewLayer layer) {
            return isExternal;
        }

        public String linkForLayer(final OpenGeoPreviewLayer layer) {
            return String.format(Locale.ENGLISH, format, urlEncode(layer.getName()));
        }

        public String label() {
            return labelText;
        }
    }

    private static class WMSLinkTemplate implements LinkTemplate, Serializable {
        private final String labelText;
        private final boolean isExternal;
        private final String extraParams;

        public WMSLinkTemplate(final String labelText, final boolean isExternal, final String extraParams) {
            this.labelText = labelText;
            this.isExternal = isExternal;
            this.extraParams = extraParams;
        }

        public boolean isExternalLink(final OpenGeoPreviewLayer layer) {
            return isExternal;
        }

        public String linkForLayer(final OpenGeoPreviewLayer layer) {
            return layer.getWmsLink() + extraParams;
        }

        public String label() {
            return labelText;
        }
    }

    private static class WFSLinkTemplate implements LinkTemplate, Serializable {
        private final String labelText;
        private final boolean isExternal;
        private final String extraParams;

        public WFSLinkTemplate(final String labelText, final boolean isExternal, final String extraParams) {
            this.labelText = labelText;
            this.isExternal = isExternal;
            this.extraParams = extraParams;
        }

        public boolean isExternalLink(OpenGeoPreviewLayer layer) {
            return isExternal;
        }

        public String linkForLayer(OpenGeoPreviewLayer layer) {
            return layer.getBaseUrl("ows")
                + "?service=WFS&version=1.0.0&request=GetFeature&typeName="
                + urlEncode(layer.getName()) + extraParams;
        }

        public String label() {
            return labelText;
        }
    }

    private static class GeoExplorerLinkTemplate implements LinkTemplate, Serializable {
        private final String base;
        private final CoordinateReferenceSystem webMercator;

        public GeoExplorerLinkTemplate(final String base, final CoordinateReferenceSystem webMercator) {
            this.base = base;
            this.webMercator = webMercator;
        }

        public boolean isExternalLink(final OpenGeoPreviewLayer layer) {
            return false;
        }

        public String linkForLayer(final OpenGeoPreviewLayer layer) {
            ReferencedEnvelope env = null;
            String boundsAsQueryParam = null;

            if (layer.getType() == PreviewLayerType.Group) {
                env = layer.getLayerGroup().getBounds();
            } else {
                env = layer.getLayer().getResource().getLatLonBoundingBox();
            }

            if (env != null) {
                try {
                    env = env.transform(webMercator, true);
                    boundsAsQueryParam = String.format(Locale.ENGLISH, "&bbox=%f,%f,%f,%f",
                        env.getMinX(), env.getMinY(), env.getMaxX(), env.getMaxY());
                } catch (Exception e) {
                    LOGGER.log(Level.WARNING, "Unable to reproject layer " + layer.getName()
                        + "to spherical mercator");
                }
            }

            return base + "/composer/?layers=" + urlEncode(layer.getName())
                + (boundsAsQueryParam == null ? "" : "&" + boundsAsQueryParam);
        }

        public String label() {
            return "GeoExplorer";
        }
    }

    private static interface LinkTemplate {
    	boolean isExternalLink(OpenGeoPreviewLayer layer);
    	String linkForLayer(OpenGeoPreviewLayer layer);
    	String label();
    }
}
