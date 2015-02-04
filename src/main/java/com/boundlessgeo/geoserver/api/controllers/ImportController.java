/* (c) 2014-2015 Boundless, http://boundlessgeo.com
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
import org.apache.commons.io.IOUtils;
import org.geoserver.catalog.Catalog;
import org.geoserver.catalog.CoverageStoreInfo;
import org.geoserver.catalog.DataStoreInfo;
import org.geoserver.catalog.LayerInfo;
import org.geoserver.catalog.NamespaceInfo;
import org.geoserver.catalog.ResourceInfo;
import org.geoserver.catalog.StoreInfo;
import org.geoserver.catalog.StyleInfo;
import org.geoserver.catalog.WMSStoreInfo;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.config.GeoServer;
import org.geoserver.config.GeoServerDataDirectory;
import org.geoserver.importer.Database;
import org.geoserver.importer.Directory;
import org.geoserver.importer.FileData;
import org.geoserver.importer.ImportContext;
import org.geoserver.importer.ImportData;
import org.geoserver.importer.ImportFilter;
import org.geoserver.importer.ImportTask;
import org.geoserver.importer.Importer;
import org.geoserver.importer.Table;
import org.geoserver.platform.resource.Resource;
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
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
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
        
        ImportContext imp = importer.createContext(dir, ws);
        
        //Check if this store already exists in the catalog
        StoreInfo store = findStore(imp, ws);
        if (store != null) {
            return (new JSONObj()).put("store", IO.store(new JSONObj(), store, request, geoServer));
        }

        return doImport(imp, ws);
    }

    @RequestMapping(value = "/{wsName}", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE)
    public @ResponseBody JSONObj importDb(@PathVariable String wsName, @RequestBody JSONObj obj, 
            HttpServletRequest request) throws Exception {
        
        // grab the workspace
        Catalog catalog = geoServer.getCatalog();
        WorkspaceInfo ws = findWorkspace(wsName, catalog);
        
        // create the import data
        Database db = new Database(hack(obj));
        
        ImportContext imp = importer.createContext(db, ws);
        
        //Check if this store already exists in the catalog
        StoreInfo store = findStore(imp, ws);
        if (store != null) {
            return (new JSONObj()).put("store", IO.store(new JSONObj(), store, request, geoServer));
        }
        
        //Return to requester to allow selection of tables.
        //Complete the import using update()
        return get(ws.getName(), imp.getId());
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
    
    ImportFilter filter(JSONObj obj, ImportContext imp) {
        Object filter = obj.get("filter");
        JSONArr arr = obj.array("tasks");
        
        if (filter == null && arr == null) {
            throw new BadRequestException("Request must contain a filter or a list of tasks");
        }
        if (arr == null) {
            if ("ALL".equals(filter)) {
                return ImportFilter.ALL;
            }
            throw new BadRequestException("Invalid filter: "+filter);
        } else {
            final List<Long> tasks = new ArrayList<Long>(arr.size());
            for (int i = 0; i < arr.size(); i++) {
                JSONObj taskObj = arr.object(i);
                
                Long taskId = Long.parseLong(taskObj.str("task"));
                if (taskId == null) {
                    throw new BadRequestException("Request must contain task identifier");
                }
                ImportTask task = imp.task(taskId);
                
                if (task == null) {
                    throw new NotFoundException("No such task: " + taskId + " for import: " + imp.getId());
                }
                tasks.add(taskId);
            }
            return new TaskIdFilter(tasks);
        }
    }
    
    /*
     * @param data - The data to import
     * @param ws - The workspace to import into
     * @return JSON representation of the import
     */
    JSONObj doImport(ImportContext imp, WorkspaceInfo ws) throws Exception {
        return doImport(imp, ws, ImportFilter.ALL);
    }
    
    /*
     * @param imp - The context to run the import from
     * @param ws - The workspace to import into
     * @param f - Filter to select import tasks
     * @return JSON representation of the import
     */
    JSONObj doImport(ImportContext imp, WorkspaceInfo ws, ImportFilter f) throws Exception {
        // run the import
        imp.setState(ImportContext.State.RUNNING);
        GeoServerDataDirectory dataDir = dataDir();
        for (ImportTask t : imp.getTasks()) {
            if (f.include(t)) {
                prepTask(t, ws, dataDir);
            } else {
                t.setState(ImportTask.State.CANCELED);
            }
        }
        
        importer.run(imp, f);

        for (ImportTask t : imp.getTasks()) {
            if (t.getState() == ImportTask.State.COMPLETE) {
                touch(t);
            }
        }
        imp.setState(ImportContext.State.COMPLETE);
        return get(ws.getName(), imp.getId());
    }
    
    /*
     * Rerun an import.
     * 
     * @param imp - The context to run the import from
     * @param ws - The workspace to import into
     * @param f - Filter to select import tasks
     * @return JSON representation of the import
     */
    JSONObj reImport(ImportContext imp, WorkspaceInfo ws, ImportFilter f) throws Exception {
     // run the import
        imp.setState(ImportContext.State.RUNNING);
        GeoServerDataDirectory dataDir = dataDir();
        //These tasks were not run the first time, and need to be set up
        List<ImportTask> newTasks = new ArrayList<ImportTask>();
        for (ImportTask t : imp.getTasks()) {
            if (f.include(t) && t.getState() == ImportTask.State.CANCELED) {
                prepTask(t, ws, dataDir);
                newTasks.add(t);
            } 
        }
        importer.run(imp, f);

        for (ImportTask t : newTasks) {
            if (t.getState() == ImportTask.State.COMPLETE) {
                touch(t);
            }
        }
        imp.setState(ImportContext.State.COMPLETE);
        return get(ws.getName(), imp.getId());
    }
    
    void prepTask(ImportTask t, WorkspaceInfo ws, GeoServerDataDirectory dataDir) {
        // 1. hack the context object to ensure that all styles are workspace local
        // 2. mark layers as "imported" so we can safely delete styles later
        
        LayerInfo l = t.getLayer();
        l.getMetadata().put(Metadata.IMPORTED, new Date());

        if (l != null && l.getDefaultStyle() != null) {
            StyleInfo s = l.getDefaultStyle();

            // JD: have to regenerate the unique name here, the importer already does this but because we are
            // putting it into the workspace we have to redo it, this should really be part of the importer
            // with an option to create styles in the workspace
            s.setName(findUniqueStyleName(l.getResource(), ws, catalog()));

            Resource from = dataDir.style(s);

            s.setWorkspace(ws);
            Resource to = dataDir.style(s);

            try {
                try (
                    InputStream in = from.in();
                    OutputStream out = to.out();
                ) {
                    IOUtils.copy(in, out);
                    from.delete();
                }
            }
            catch(IOException e){
                throw new RuntimeException("Error copying style to workspace", e);
            }
        }
 
    }

    String findUniqueStyleName(ResourceInfo resource, WorkspaceInfo workspace, Catalog catalog) {
        String styleName = resource.getName();
        StyleInfo style = catalog.getStyleByName(workspace, styleName);
        int i = 1;
        while(style != null) {
            styleName = resource.getName() + i;
            style = catalog.getStyleByName(workspace, styleName);
            i++;
        }
        return styleName;
    }

    @RequestMapping(value = "/{wsName}/{id}", method = RequestMethod.GET)
    public @ResponseBody JSONObj get(@PathVariable String wsName, @PathVariable Long id) throws Exception {
        ImportContext imp = findImport(id);

        JSONObj result = new JSONObj();
        result.put("id", imp.getId());

        JSONArr preimport = result.putArray("preimport");
        JSONArr imported = result.putArray("imported");
        JSONArr pending = result.putArray("pending");
        JSONArr failed = result.putArray("failed");
        JSONArr ignored = result.putArray("ignored");

        for (ImportTask task : imp.getTasks()) {
            if (imp.getState() == ImportContext.State.PENDING) {
                preimport.add(task(task));
            } else {
                switch(task.getState()) {
                    case COMPLETE:
                        imported.add(complete(task));
                        break;
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

        Catalog catalog = geoServer.getCatalog();
        WorkspaceInfo ws = findWorkspace(wsName, catalog);
        
        ImportContext imp = findImport(id);
        ImportFilter f = filter(obj, imp);
        
        //Pre-import (Database import only)
        if (imp.getState() == ImportContext.State.PENDING) {
            // create the import data
            
            return doImport(imp, ws, f);
        }
        
        //Re-import
        JSONArr arr = obj.array("tasks");
        
        //Filter only: run on all tasks that match the filter
        if (arr == null) {
            return reImport(imp, ws, f);
        }
        
        //Task List: Update CRS tasks, run all tasks that match filter or list.
        for (int i = 0; i < arr.size(); i++) {
            
            JSONObj taskObj = arr.object(i);
            
            Long taskId = Long.parseLong(taskObj.str("task"));
            if (taskId == null) {
                throw new BadRequestException("Request must contain task identifier");
            }
            ImportTask task = imp.task(taskId);
            if (task == null) {
                throw new NotFoundException("No such task: " + taskId + " for import: " + id);
            }
            
            ResourceInfo resource = task.getLayer().getResource();
            
            if (task.getState() == ImportTask.State.NO_CRS) {
                JSONObj proj = taskObj.object("proj");
                if (proj == null) {
                    throw new BadRequestException("Task "+taskId+" requires a 'proj' property");
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
        }
        return reImport(imp, ws, f);
    }

    ImportContext findImport(Long id) {
        ImportContext imp = importer.getContext(id);
        if (imp == null) {
            throw new NotFoundException("No such import: " + id);
        }
        return imp;
    }
    
    StoreInfo findStore(ImportContext imp, WorkspaceInfo ws) throws Exception {
        Catalog catalog = geoServer.getCatalog();
        ImportData data = imp.getData();
        if (data.getFormat() == null) {
            return null;
        }
        
        StoreInfo store = data.getFormat().createStore(data, ws, catalog);
        if (!store.getConnectionParameters().containsKey("namespace")) {
            if (ws != null) {
                NamespaceInfo ns = catalog.getNamespaceByPrefix(ws.getName());
                if (ns != null) {
                    store.getConnectionParameters().put("namespace", ns.getURI());
                }
            }
        }
        Class<? extends StoreInfo> clazz = StoreInfo.class;
        if (store instanceof CoverageStoreInfo) {
            clazz = CoverageStoreInfo.class;
        } else if (store instanceof DataStoreInfo) {
            clazz = DataStoreInfo.class;
        } else if (store instanceof WMSStoreInfo) {
            clazz = WMSStoreInfo.class;
        }
        List<? extends StoreInfo> stores = catalog.getStoresByWorkspace(ws, clazz);
        for (StoreInfo s : stores) {
            if (s.getConnectionParameters().equals(store.getConnectionParameters())) {
                return s;
            }
        }
        return null;
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
        JSONObj obj = new JSONObj();
        obj.put("task", task.getId())
           .put("name", name(task))
           .put("type", type(task))
           .put("geometry", IO.geometry(task.getLayer()));
        return obj;
    }

    JSONObj complete(ImportTask task) {
        touch(task);

        LayerInfo layer = task.getLayer();
        JSONObj obj = task(task);
        IO.layerDetails(obj.putObject("layer"), layer, null);
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
        return new JSONObj().put("task", task.getId()).put("name", name(task));
    }
    
    String name(ImportTask task) {
        ImportData data = task.getData();
        if (data instanceof FileData) {
            return FilenameUtils.getName(data.toString());
        }
        return data.getName();
    }
    
    String type(ImportTask task) {
        ImportData data = task.getData();
        if (data instanceof Database) {
            return "database";
        }
        if (data instanceof FileData) {
            return "file";
        }
        if (data instanceof Table) {
            return "table";
        }
        return "null";
    }
    
    static class TaskIdFilter implements ImportFilter {
        List<Long> tasks;
        
        public TaskIdFilter(List<Long> tasks) {
            this.tasks = tasks;
        }
        @Override
        public boolean include(ImportTask task) {
            return tasks.contains(task.getId());
        }
    
    }

}
