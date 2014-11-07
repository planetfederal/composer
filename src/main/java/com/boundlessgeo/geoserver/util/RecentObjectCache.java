/* (c) 2014 Boundless, http://boundlessgeo.com
 * This code is licensed under the GPL 2.0 license.
 */
package com.boundlessgeo.geoserver.util;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.google.common.collect.EvictingQueue;
import org.geoserver.catalog.Info;
import org.geoserver.catalog.WorkspaceInfo;
import org.geoserver.ows.util.OwsUtils;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.concurrent.ExecutionException;

/**
 * Tracks recently used objects.
 */
@Component
public class RecentObjectCache {

    public static final int DEFAULT_SIZE = 5;

    LoadingCache<Class<?>, EvictingQueue<Ref>> cache;

    public RecentObjectCache() {
        this(DEFAULT_SIZE);
    }

    public RecentObjectCache(final int size) {
        cache = CacheBuilder.newBuilder().build(new CacheLoader<Class<?>, EvictingQueue<Ref>>() {
            @Override
            public EvictingQueue<Ref> load(Class<?> key) throws Exception {
                return EvictingQueue.create(size);
            }
        });
    }

    public <T extends Info> void add(Class<T> clazz, T obj) {
        if (!OwsUtils.has(obj, "workspace")) {
            throw new IllegalArgumentException("Object has no workspace property, use add(Class,T,String) method");
        }

        WorkspaceInfo ws = (WorkspaceInfo) OwsUtils.get(obj, "workspace");
        add(clazz, obj, ws!=null?ws.getName():null);
    }

    public <T extends Info> void add(Class<T> clazz, T obj, String workspace) {
        if (obj == null || obj.getId() == null) {
            return;
        }

        EvictingQueue<Ref> q = q(clazz);
        synchronized (q) {
            q.offer(Ref.to(obj, workspace));
        }
    }

    public <T extends Info> Iterable<Ref> list(Class<T> clazz) {
        List<Ref> list = null;

        EvictingQueue<Ref> q = q(clazz);
        synchronized (q) {
            list = new ArrayList(q);
        }

        Collections.reverse(list);
        return new LinkedHashSet<>(list);
    }

    public <T extends Info> boolean remove(Class<T> clazz, T obj) {
        if (obj == null || obj.getId() == null) {
            return false;
        }

        EvictingQueue<Ref> q = q(clazz);
        synchronized (q) {
            return q.remove(Ref.to(obj.getId()));
        }
    }

    <T> EvictingQueue<Ref> q(Class<T> clazz) {
        try {
            return cache.get(clazz);
        } catch (ExecutionException e) {
            throw new RuntimeException(e);
        }
    }

    public static class Ref {
        public final String id;
        public final String name;
        public final String workspace;
        public final Date modified;

        public static Ref to(String id) {
            return new Ref(id, null, null);
        }

        public static <T extends Info> Ref to(Info obj, String workspace) {
            String id = obj.getId();
            String name = (String) OwsUtils.get(obj, "name");

            return new Ref(id, name, workspace);
        }

        public Ref(String id, String name, String workspace) {
            this.id = id;
            this.name = name;
            this.workspace = workspace;
            this.modified = new Date();
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;

            Ref ref = (Ref) o;

            if (id != null ? !id.equals(ref.id) : ref.id != null) return false;

            return true;
        }

        @Override
        public int hashCode() {
            return id != null ? id.hashCode() : 0;
        }
    }
}
