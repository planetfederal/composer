/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.api.controllers;

import com.boundlessgeo.geoserver.api.exceptions.BadRequestException;
import com.boundlessgeo.geoserver.api.exceptions.NotFoundException;
import com.boundlessgeo.geoserver.json.JSONArr;
import com.boundlessgeo.geoserver.json.JSONObj;
import com.boundlessgeo.geoserver.util.Hasher;
import com.google.common.collect.Maps;
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.io.FilenameUtils;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.ResourceInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.config.GeoServer;
import org.geoserver.importer.Database;
import org.geoserver.importer.Directory;
import org.geoserver.importer.ImportContext;
import org.geoserver.importer.ImportData;
import org.geoserver.importer.ImportFilter;
import org.geoserver.importer.ImportTask;
import org.geoserver.importer.Importer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.Serializable;
import java.util.Date;
import java.util.Iterator;
import java.util.Map;

@Controller
@RequestMapping("/api/imports")
public class ImportController extends ApiController {

    Importer importer;
    Hasher hasher;

    @Autowired
    public ImportController(GeoServer geoServer, Importer importer) {
        super(geoServer);
        this.importer = importer;
        this.hasher = new Hasher(7);
    }

    @RequestMapping(value = "/{wsName}", method = RequestMethod.POST, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public @ResponseBody
    JSONObj importFile(@PathVariable String wsName, HttpServletRequest request)
        throws Exception {

        // grab the workspace
        Catalog catalog = geoServer.getCatalog();
        WorkspaceInfo ws = findWorkspace(wsName, catalog);

        // get the uploaded files
        Iterator<FileItem> files = doFileUpload(request);
        if (!files.hasNext()) {
            throw new BadRequestException("Request must contain a single file");
        }

        // create a new temp directory for the uploaded file
        File uploadDir = dataDir().get(ws, "data", hasher.get().toLowerCase()).dir();
        if (!uploadDir.exists()) {
            throw new RuntimeException("Unable to create directory for file upload");
        }

        // pass off the uploaded file to the importer
        Directory dir = new Directory(uploadDir);
        dir.accept(files.next());

        return doImport(dir, ws);
    }

    @RequestMapping(value = "/{wsName}", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE)
    public @ResponseBody JSONObj importDb(@PathVariable String wsName, @RequestBody JSONObj obj) throws Exception {
        // grab the workspace
        Catalog catalog = geoServer.getCatalog();
        WorkspaceInfo ws = findWorkspace(wsName, catalog);

        // create the import data
        Database db = new Database(hack(obj));
        return doImport(db, ws);
    }

    Map<String, Serializable> hack(JSONObj obj) {
        Map<String,Serializable> map = Maps.newLinkedHashMap();
        for (Object e : obj.raw().entrySet()) {
            Map.Entry<String,Serializable> entry = (Map.Entry) e;
            Serializable value = entry.getValue();
            if (value instanceof Long) {
                value = ((Long)value).intValue();
            }
            map.put(entry.getKey(), value);
        }
        return map;
    }

    JSONObj doImport(ImportData data, WorkspaceInfo ws) throws Exception {
        // run the import
        ImportContext imp = importer.createContext(data, ws);
        importer.run(imp);

        for (ImportTask t : imp.getTasks()) {
            if (t.getState() == ImportTask.State.COMPLETE) {
                touch(t);
            }
        }
        return get(ws.getName(), imp.getId());
    }

    @RequestMapping(value = "/{wsName}/{id}", method = RequestMethod.GET)
    public @ResponseBody JSONObj get(@PathVariable String wsName, @PathVariable Long id) throws Exception {
        ImportContext imp = findImport(id);

        JSONObj result = new JSONObj();
        result.put("id", imp.getId());

        JSONArr imported = result.putArray("imported");
        JSONArr pending = result.putArray("pending");
        JSONArr failed = result.putArray("failed");
        JSONArr ignored = result.putArray("ignored");

        for (ImportTask task : imp.getTasks()) {
            if (task.getState() == ImportTask.State.COMPLETE) {
                imported.add(complete(task));
            }
            else {
                switch(task.getState()) {
                    case NO_BOUNDS:
                    case NO_CRS:
                        pending.add(pending(task));
                        // fixable state, throw into pending
                        break;
                    case ERROR:
                        // error, dump out some details
                        failed.add(failed(task));
                        break;
                    default:
                        // ignore this task
                        ignored.add(ignored(task));
                }
            }
        }

        return result;
    }

    @RequestMapping(value = "/{wsName}/{id}", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE)
    public @ResponseBody JSONObj update(@PathVariable String wsName, @PathVariable Long id, @RequestBody JSONObj obj)
        throws Exception {

        ImportContext imp = findImport(id);

        Integer t = obj.integer("task");
        if (t == null) {
            throw new BadRequestException("Request must contain task identifier");
        }

        final ImportTask task = imp.task(t);
        if (task == null) {
            throw new NotFoundException("No such task: " + t + " for import: " + id);
        }

        ResourceInfo resource = task.getLayer().getResource();

        if (task.getState() == ImportTask.State.NO_CRS) {
            JSONObj proj = obj.object("proj");
            if (proj == null) {
                throw new BadRequestException("Request must contain a 'proj' property");
            }

            try {
                resource.setSRS(IO.srs(proj));
                resource.setNativeCRS(IO.crs(proj));
                importer.changed(task);
            }
            catch(Exception e) {
                throw new BadRequestException("Unable to parse proj: " + proj.toString());
            }
        }

        importer.run(imp, new ImportFilter() {
            @Override
            public boolean include(ImportTask t) {
                return task.getId() == t.getId();
            }
        });

        if (task.getState() == ImportTask.State.COMPLETE) {
            return complete(task);
        }
        else {
            switch(task.getState()) {
                case NO_CRS:
                case NO_BOUNDS:
                    return pending(task);
                case ERROR:
                    return failed(task);
                default:
                    return ignored(task);
            }
        }
    }

    ImportContext findImport(Long id) {
        ImportContext imp = importer.getContext(id);
        if (imp == null) {
            throw new NotFoundException("No such import: " + id);
        }
        return imp;
    }

    void touch(ImportTask task) {
        LayerInfo l = task.getLayer();
        l = catalog().getLayer(l.getId());
        if (l != null) {
            Date now = new Date();
            Metadata.created(l, now);
            Metadata.modified(l, now);
            geoServer.getCatalog().save(l);
        }
    }

    JSONObj task(ImportTask task) {
        return new JSONObj().put("task", task.getId())
            .put("file", filename(task));
    }

    JSONObj complete(ImportTask task) {
        touch(task);

        LayerInfo layer = task.getLayer();
        JSONObj obj = task(task);
        IO.layer(obj.putObject("layer"), layer);
        return obj;
    }

    JSONObj pending(ImportTask task) {
        return task(task).put("problem", task.getState().toString());
    }

    JSONObj failed(ImportTask task) {
        JSONObj err = task(task);
        IO.error(err, task.getError() );
        return err;
    }

    JSONObj ignored(ImportTask task) {
        return new JSONObj().put("task", task.getId()).put("file", filename(task));
    }
    
    String filename(ImportTask task) {
        ImportData data = task.getData();
        return FilenameUtils.getName(data.toString());
    }

}
