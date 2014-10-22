/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import com.boundlessgeo.geoserver.Proj;
import com.boundlessgeo.geoserver.api.exceptions.BadRequestException;
import com.boundlessgeo.geoserver.api.exceptions.NotFoundException;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;
import org.geoserver.config.GeoServer;
import org.opengis.referencing.NoSuchAuthorityCodeException;
import org.opengis.referencing.crs.CoordinateReferenceSystem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Map;

@Controller
@RequestMapping("/api/projections")
public class ProjController extends ApiController {

    @Autowired
    public ProjController(GeoServer geoServer) {
        super(geoServer);
    }

    @RequestMapping(value = "/{srs}", method = RequestMethod.GET)
    public @ResponseBody
    JSONObj get(@PathVariable String srs) throws Exception {
        srs = srs.toUpperCase();

        CoordinateReferenceSystem crs = null;
        try {
            crs = Proj.get().crs(srs);
        }
        catch(Exception e1) {
            throw new BadRequestException("Bad srs: " + srs, e1);
        }

        if (crs == null) {
            throw new NotFoundException("No such projection: " + srs);
        }

        return IO.proj(new JSONObj(), crs, srs);
    }

    @RequestMapping(value = "/recent", method = RequestMethod.GET)
    public @ResponseBody JSONArr recent() throws Exception {
        JSONArr arr = new JSONArr();
        for (Map.Entry<String,CoordinateReferenceSystem> e : Proj.get().recent().entrySet()) {
            IO.proj(arr.addObject(), e.getValue(), e.getKey());
        }
        return arr;
    }

}
